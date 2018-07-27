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
    r(['vs/language/typescript/tokenization'], (tokenization) => {
      monaco.languages.register({
        id: 'ts',
        extensions: ['.ts', '.tsx'],
        aliases: ['TypeScript', 'ts', 'typescript'],
        mimetypes: ['text/typescript']
      });
      monaco.languages.register({
        id: 'js',
        extensions: ['.js', '.es6', '.jsx'],
        firstLine: '^#!.*\\bnode',
        filenames: ['jakefile'],
        aliases: ['JavaScript', 'javascript', 'js'],
        mimetypes: ['text/javascript'],
      });
      monaco.languages.setTokensProvider('ts', tokenization.createTokenizationSupport(tokenization.Language.TypeScript));
      monaco.languages.setTokensProvider('js', tokenization.createTokenizationSupport(tokenization.Language.EcmaScript5));
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

