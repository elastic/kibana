// this file is not transpiled
'use strict'; // eslint-disable-line strict

const cloneDeep = require('lodash').cloneDeep;
const fromRoot = require('path').resolve.bind(null, __dirname, '../../');

if (!process.env.BABEL_CACHE_PATH) {
  process.env.BABEL_CACHE_PATH = fromRoot('optimize/.babelcache.json');
}

exports.webpack = {
  stage: 1,
  nonStandard: false,
  optional: ['runtime']
};

exports.node = cloneDeep(exports.webpack);
exports.node.optional = ['asyncToGenerator'];
exports.node.blacklist = ['regenerator'];
