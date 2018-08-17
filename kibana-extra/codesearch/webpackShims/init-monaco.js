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
    r(['vs/language/typescript/languageFeatures',
      'vs/editor/browser/editorExtensions',
      'vs/base/browser/htmlContentRenderer',
      'vs/editor/common/modes/textToHtmlTokenizer',
      'vs/base/browser/ui/scrollbar/scrollableElement',
      'vs/editor/standalone/browser/standaloneCodeServiceImpl',
      'vs/editor/common/modes'], (ts, extensions, renderer, tokenizer, scrollable, standaloneCodeServiceImpl, modes) => {
      monaco.renderer = renderer;
      monaco.tokenizer = tokenizer;
      monaco.scrollable = scrollable;
      monaco.modes = modes;
      monaco.typescript = ts;
      monaco.StandaloneCodeEditorServiceImpl = standaloneCodeServiceImpl.StandaloneCodeEditorServiceImpl;
      callback(monaco, extensions)
    });
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
