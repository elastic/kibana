process.env.BABEL_CACHE_PATH = require('path').resolve(__dirname, '../../optimize/.babelcache.json');

exports.webpack = {
  stage: 1,
  nonStandard: false,
  optional: ['runtime']
};

exports.node = Object.assign({}, exports.webpack);
