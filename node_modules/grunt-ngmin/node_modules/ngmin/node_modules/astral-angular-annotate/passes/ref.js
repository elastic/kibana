// mark calls off of referenced 'ngModule's

var refPass = module.exports = require('astral-pass')();

refPass.name = 'angular:annotator:ref';
refPass.prereqs = [
  'angular:annotator:mark'
];

refPass.
  when(require('../signatures/assign')).
  when(require('../signatures/decl')).
  do(function (chunk, info) {
    info = info[refPass.name];

    if (!info.modules) {
      info.modules = [];
    }
    
    var id = chunk.id ?
      chunk.id.name :
      chunk.expression.left.name;

    if (info.modules.indexOf(id) === -1) {
      info.modules.push(id);
    }

    return info;
  });
