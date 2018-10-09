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
  r.config({
      paths: {
        'vs': '../monaco/vs',
        'vs/language/typescript/languageFeatures': '../monaco/vs/language/typescript/tsMode.js'
      },
  });
  r(['vs/editor/editor.main'], () => {
    r(['vs/language/typescript/languageFeatures',
      'vs/base/browser/htmlContentRenderer',
      'vs/editor/common/modes/textToHtmlTokenizer',
      'vs/base/browser/ui/scrollbar/scrollableElement',
      'vs/editor/standalone/browser/standaloneCodeServiceImpl',
      'vs/editor/common/modes',
      'vs/base/common/async',
      'vs/editor/contrib/wordHighlighter/wordHighlighter'],
      (ts, renderer, tokenizer, scrollable, standaloneCodeServiceImpl, modes, async, wordHighlighter) => {
      monaco.renderer = renderer;
      monaco.tokenizer = tokenizer;
      monaco.scrollable = scrollable;
      monaco.modes = modes;
      monaco.typescript = ts;
      monaco.StandaloneCodeEditorServiceImpl = standaloneCodeServiceImpl.StandaloneCodeEditorServiceImpl;
      monaco.async= async;
      monaco.wordHighlighter= wordHighlighter;
      callback(monaco)
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
