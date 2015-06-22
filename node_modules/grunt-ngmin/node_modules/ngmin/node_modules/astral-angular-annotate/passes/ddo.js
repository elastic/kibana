// mark directive description objects

var annotateInjectable = require('../lib/annotate-injectable');
var deepApply = require('../lib/deep-apply');

var ddoAnnotatorPass = module.exports = {};
ddoAnnotatorPass.name = 'angular:annotator:ddo';
ddoAnnotatorPass.prereqs = [
  'angular:annotator:mark'
];

ddoAnnotatorPass.run = function (ast, info) {
  deepApply(ast, [{
    "type": "CallExpression",
    "callee": {
      "type": "MemberExpression",
      "object": {
        "ngModule": true
      },
      "property": {
        "type": "Identifier",
        "name": "directive"
      }
    }
  }], function (directiveChunk) {
    deepApply(directiveChunk, [{
      "type": "ReturnStatement",
      "argument": {
        "type": "ObjectExpression"
      }
    }], function (returnChunk) {
      deepApply(returnChunk, [{
        "type": "Property",
        "key": {
          "type": "Identifier",
          "name": "controller"
        },
        "value": {
          "type": "FunctionExpression"
        }
      }], function (controllerChunk) {
        controllerChunk.value = annotateInjectable(controllerChunk.value);
      });
    });
  });
};
