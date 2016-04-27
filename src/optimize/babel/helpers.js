// this file is not transpiled

exports.fromRoot = require('path').resolve.bind(null, __dirname, '../../../');

exports.setupBabelCache = function (env) {
  if (!env.BABEL_CACHE_PATH) {
    env.BABEL_CACHE_PATH = exports.fromRoot('optimize/.babelcache.json');
  }

  if (!env.WEBPACK_BABEL_CACHE_DIR) {
    env.WEBPACK_BABEL_CACHE_DIR = exports.fromRoot('optimize/.webpack.babelcache');
  }
};
