// mark angular modules with "ngModule"

var deepApply = require('../lib/deep-apply');
var clone = require('clone');

var modSigs = [ require('../signatures/module') ].
  concat(require('../signatures/simple'));

var refSigs = [
  require('../signatures/assign'),
  require('../signatures/decl')
];

var idSigs = clone(require('../signatures/simple'));

var markPass = module.exports = {};

markPass.name = 'angular:annotator:mark';
markPass.prereqs = [];
markPass.run = function (ast, info) {

  var moduleIds = [];

  var findModules = function () {
    var res = false;
    deepApply(ast, modSigs, function (chunk) {
      if (!chunk.ngModule) {
        chunk.ngModule = true;
        res = true;
      }
    });
    return res;
  };

  var findRefs = function () {
    var refs = false,
      res = false;

    // find refs

    deepApply(ast, refSigs, function (chunk) {
      var id = chunk.id ?
        chunk.id.name :
        chunk.expression.left.name;

      if (moduleIds.indexOf(id) === -1) {
        moduleIds.push(id);
        refs = true;
      }
    });

    // mark refs

    if (refs) {

      // update idSigs
      var namedModuleMemberExpression = {
        "type": "Identifier",
        "name": new RegExp('^(' + moduleIds.join('|') + ')$')
      };
      idSigs = idSigs.map(function (signature) {
        signature.callee.object = namedModuleMemberExpression;
        return signature;
      });

      deepApply(ast, idSigs, function (chunk) {
        if (!chunk.ngModule) {
          chunk.callee.object.ngModule = true;
          res = true;
        }
      });
    }

    return res;
  };

  while (findModules() || findRefs());
};
