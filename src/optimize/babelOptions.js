var cloneDeep = require('lodash').cloneDeep;
var fromRoot = require('path').resolve.bind(null, __dirname, '../../');

if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = fromRoot('optimize/.babelcache.json');
}

exports.webpack = {
  stage: 1,
  nonStandard: false,
  optional: ['runtime']
};

exports.node = cloneDeep(exports.webpack);
