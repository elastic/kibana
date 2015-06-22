
var esprima = require('esprima'),
  escodegen = require('escodegen'),
  astral = require('astral')();

// register angular annotator in astral
require('astral-angular-annotate')(astral);

var annotate = exports.annotate = function (inputCode) {

  var ast = esprima.parse(inputCode, {
    tolerant: true,
    comment: true,
    range: true,
    tokens: true
  });
  // TODO: unstable API, see https://github.com/Constellation/escodegen/issues/10
  ast = escodegen.attachComments(ast, ast.comments, ast.tokens);

  astral.run(ast);

  var generatedCode = escodegen.generate(ast, {
    format: {
      indent: {
        style: '  '
      }
    },
    comment: true
  });

  return generatedCode;
};
