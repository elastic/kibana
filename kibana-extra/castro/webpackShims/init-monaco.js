var listeners = [];
var _ready = false;

function ready() {
  listeners.forEach(function (cb) {
    cb()
  });
  listeners = [];
  _ready = true;
}

if (document) {
  var el = document.getElementById("monaco-loader");
  if (!el) {
    el = document.createElement('script');
    el.setAttribute("id", "monaco-loader");
    el.setAttribute('src', '../monaco/vs/loader.js');
    el.setAttribute('async', '');
    el.addEventListener('load', ready);

    document.head.appendChild(el);
  }
}

function handleNow(callback) {
  const r = window['require'];
  r.config({ paths: { 'vs': '../monaco/vs' } });
  r(['vs/editor/editor.main'], () => {
    callback(monaco)
  });
}

module.exports.initMonaco = function (callback) {
  if (_ready) {
    handleNow(callback)
  } else {
    listeners.push(function () {
      handleNow(callback)
    });
  }
};