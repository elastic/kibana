// mark route objects

var annotateInjectable = require('../lib/annotate-injectable');
var deepApply = require('../lib/deep-apply');

var routeAnnotatorPass = module.exports = {};
routeAnnotatorPass.name = 'angular:annotator:route';
routeAnnotatorPass.prereqs = [
  'angular:annotator:mark'
];

routeAnnotatorPass.run = function (ast, info) {
  deepApply(ast, [{
    "type": "CallExpression",
    "callee": {
      "type": "MemberExpression",
      "object": {
        "ngModule": true
      },
      "property": {
        "type": "Identifier",
        "name": "config"
      }
    }
  }], function (routeChunk) {
    deepApply(routeChunk, [{
      "type": "CallExpression",
      "callee": {
        "type": "MemberExpression",
        "property": {
          "type": "Identifier",
          "name": "when"
        }
      },
      "arguments": [ {},
        {
          "type": "ObjectExpression"
        }
      ]
    }],function (whenChunk) {
      deepApply(whenChunk, [{
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
