var fromRoot = require('requirefrom')('src/utils')('fromRoot');

exports.webpack = {
  stage: 1,
  nonStandard: false,
  optional: ['runtime']
};

exports.node = Object.assign({
  ignore: [
    fromRoot('src'),
    /[\\\/](node_modules|bower_components)[\\\/]/
  ]
}, exports.webpack);
