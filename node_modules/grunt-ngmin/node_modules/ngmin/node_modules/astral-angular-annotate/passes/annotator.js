// annotate "ngModule"

var annotateInjectable = require('../lib/annotate-injectable');
var annotatorPass = module.exports = require('astral-pass')();

annotatorPass.name = 'angular:annotator';
annotatorPass.prereqs = [
  'angular:annotator:mark'
];

annotatorPass.
  when(require('../signatures/simple')).
  do(function (chunk, info) {
    var type;

    if (chunk.callee &&
      chunk.callee.property &&
      chunk.callee.property.name) {
      type = chunk.callee.property.name;
    }

    var argIndex = 1;
    if (type === 'config' || type === 'run') {
      argIndex = 0;
    }

    if (type === 'constant' || type === 'value') {
      return;
    }
    chunk.arguments[argIndex] = annotateInjectable(chunk.arguments[argIndex]);
  });
