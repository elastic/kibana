import { cloneDeep } from 'lodash';
let fromRoot = require('path').resolve.bind(null, __dirname, '../../');

if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = fromRoot('optimize/.babelcache.json');
}

exports.webpack = {
  stage: 1,
  nonStandard: true,
  optional: ['runtime']
};

exports.node = cloneDeep({
  ignore: [
    fromRoot('src'),
    /[\\\/](node_modules|bower_components)[\\\/]/
  ]
}, exports.webpack);
