
var annotateInjectable = require('../lib/annotate-injectable');
var deepApply = require('../lib/deep-apply');

// mark provider description objects
var pdoAnnotatorPass = {};
pdoAnnotatorPass.name = 'angular:annotator:pdo';
pdoAnnotatorPass.prereqs = [
  'angular:annotator:mark'
];

pdoAnnotatorPass.run = function (ast, info) {

  deepApply(ast, [{
    "type": "CallExpression",
    "callee": {
      "type": "MemberExpression",
      "object": {
        "ngModule": true
      },
      "property": {
        "type": "Identifier",
        "name": "provider"
      }
    }
  }], function (providerChunk) {

    // PDO annotations - defined by function

    deepApply(providerChunk, [{
      "type": "ExpressionStatement",
      "expression": {
        "type": "AssignmentExpression",
        "left": {
          "type": "MemberExpression",
          "object": {
            "type": "ThisExpression"
          },
          "property": {
            "type": "Identifier",
            "name": "$get"
          }
        },
        "right": {
          "type": "FunctionExpression"
        }
      }
    }], function (pdoChunk) {
      pdoChunk.expression.right = annotateInjectable(pdoChunk.expression.right);
    });

    // PDO annotations defined by object

    deepApply(providerChunk, [{
      "type": "ObjectExpression"
    }], function(objectChunk) {
      objectChunk.properties.forEach(function (property) {
        deepApply(property, [{
          "type": "Property",
          "key": {
            "type": "Identifier",
            "name": "$get"
          },
          "value": {
            "type": "FunctionExpression"
          }
        }], function (propertyChunk) {
          propertyChunk.value = annotateInjectable(propertyChunk.value);
        });
      });
    });
  });
};

module.exports = pdoAnnotatorPass;
