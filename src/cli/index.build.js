var _ = require('lodash');
var fromRoot = require('requirefrom')('src/utils')('fromRoot');

var babelOpts = _.defaults({
  ignore: [
    fromRoot('src'),
    /[\\\/](node_modules|bower_components)[\\\/]/
  ]
}, require('../optimize/babelOptions').node);

require('babel/register')(babelOpts);
require('./cli');
