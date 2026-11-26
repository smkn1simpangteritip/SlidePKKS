/* fullscreen.js
   Menampilkan presentasi layar penuh (tanpa tab dan address bar browser) di semua halaman.

   Cara kerja:
   - Browser hanya mengizinkan layar penuh setelah pengguna mengklik atau menekan tombol,
     dan layar penuh biasanya keluar sendiri saat pindah halaman.
   - Karena itu, setiap halaman dibuka di dalam "cangkang" (satu iframe penuh) yang tidak pernah
     dimuat ulang. Layar penuh dipasang pada cangkang itu, jadi tetap aktif saat pindah halaman.
   - Klik atau tekan tombol pertama di halaman mana pun akan masuk layar penuh otomatis.
     Tombol di tengah bawah atau tombol F untuk masuk/keluar secara manual.
   Pasang dengan: <script src="fullscreen.js"></script> di <head> setiap halaman. */
(function () {
  var inFrame = window.top !== window.self;

  /* ================= MODE CANGKANG (halaman dibuka langsung) ================= */
  if (!inFrame) {
    var src = location.href;
    document.open();
    document.write(
      '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Presentasi</title>' +
      '<style>html,body{margin:0;height:100%;background:#0A2C33;overflow:hidden}' +
      'iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:0;background:#0A2C33}</style>' +
      '</head><body><iframe id="pg" allow="fullscreen" title="Presentasi"></iframe></body></html>'
    );
    document.close();

    var frame = document.getElementById('pg');
    var el = document.documentElement;
    var tried = false;

    function supported() {
      return !!(el.requestFullscreen || el.webkitRequestFullscreen);
    }
    function isFull() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }
    function enter() {
      try {
        var r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        if (r && r.catch) r.catch(function () {});
      } catch (e) {}
    }
    function leave() {
      try {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } catch (e) {}
    }
    function toChild(msg) {
      try { frame.contentWindow.postMessage(msg, '*'); } catch (e) {}
    }
    function focusChild() {
      try { frame.contentWindow.focus(); } catch (e) {}
    }

    window.addEventListener('message', function (e) {
      if (!e.data || e.source !== frame.contentWindow) return;
      var t = e.data.fsType;
      if (t === 'meta') {
        if (e.data.title) document.title = e.data.title;
        toChild({ fsType: 'state', on: isFull(), ok: supported() });
      } else if (t === 'gesture') {
        if (!tried && supported() && !isFull()) { tried = true; enter(); }
      } else if (t === 'toggle') {
        tried = true;
        if (!supported()) return;
        if (isFull()) leave(); else enter();
      }
    });

    function onFsChange() {
      toChild({ fsType: 'state', on: isFull(), ok: supported() });
      setTimeout(focusChild, 50);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    frame.addEventListener('load', focusChild);

    frame.src = src;
    return;
  }

  /* ================= MODE HALAMAN (di dalam cangkang) ================= */
  var gestured = false;
  function post(type) {
    try { window.parent.postMessage({ fsType: type }, '*'); } catch (e) {}
  }

  /* gerakan pertama pengguna di halaman mana pun: masuk layar penuh */
  function firstGesture(ev) {
    if (gestured) return;
    if (ev.target && ev.target.closest && ev.target.closest('.fsx')) return;
    if (ev.type === 'keydown') {
      if (ev.key === 'Escape') return;
      if (ev.key === 'f' || ev.key === 'F') return; /* ditangani sebagai toggle */
    }
    gestured = true;
    post('gesture');
  }
  document.addEventListener('pointerdown', firstGesture, true);
  document.addEventListener('keydown', firstGesture, true);

  /* tombol F: masuk/keluar layar penuh */
  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === 'f' || ev.key === 'F') {
      gestured = true;
      post('toggle');
    }
  }, true);

  /* tombol layar penuh di tengah bawah */
  function addButton() {
    var css = document.createElement('style');
    css.textContent =
      '.fsx{position:fixed;left:50%;bottom:clamp(14px,2.5vw,40px);transform:translateX(-50%);z-index:30;width:44px;height:44px;' +
      'border-radius:50%;border:2px solid rgba(244,247,246,.2);background:rgba(10,44,51,.6);color:#F4F7F6;cursor:pointer;' +
      'display:none;place-items:center;padding:0;opacity:.55;transition:opacity .2s,border-color .2s,background .2s}' +
      '.fsx.ok{display:grid}' +
      '.fsx:hover,.fsx:focus-visible{opacity:1;border-color:#F0B429;background:rgba(10,44,51,.9)}' +
      '.fsx:focus-visible{outline:3px solid #F0B429;outline-offset:3px}' +
      '.fsx svg{width:22px;height:22px}.fsx .o{display:none}.fsx.on .i{display:none}.fsx.on .o{display:block}';
    document.head.appendChild(css);

    var b = document.createElement('button');
    b.className = 'fsx';
    b.type = 'button';
    b.setAttribute('aria-label', 'Layar penuh (tombol F)');
    b.title = 'Layar penuh (F)';
    b.innerHTML =
      '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>' +
      '<svg class="o" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/></svg>';
    b.addEventListener('click', function () { gestured = true; post('toggle'); });
    document.body.appendChild(b);

    window.addEventListener('message', function (e) {
      if (!e.data || e.data.fsType !== 'state') return;
      b.classList.toggle('on', !!e.data.on);
      b.classList.toggle('ok', e.data.ok !== false);
    });

    /* beri tahu cangkang: judul halaman dan minta status layar penuh */
    try {
      window.parent.postMessage({ fsType: 'meta', title: document.title }, '*');
    } catch (err) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton);
  else addButton();
})();
