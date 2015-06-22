
/*
 * Test utils
 */


var esprima = require('esprima'),
  escodegen = require('escodegen');

var fnDecl = /^[ ]*function[ ]?\(\)[ ]?\{\n/m,
  trailingBrace = /[ ]*\}(?![\s\S]*\})/m;

// given a function, return its body as a string.
// makes tests look a bit cleaner
exports.stringifyFunctionBody = function (fn) {
  var out = fn.toString().
    replace(fnDecl, '').
    replace(trailingBrace, '');

  // then normalize with esprima/escodegen
  var ast = esprima.parse(out, {
    tolerant: true,
    comment: true,
    range: true,
    tokens: true
  });
  // TODO: unstable API, see https://github.com/Constellation/escodegen/issues/10
  ast = escodegen.attachComments(ast, ast.comments, ast.tokens);

  out = escodegen.generate(ast, {
    format: {
      indent: {
        style: '  '
      }
    },
    comment: true
  });

  return out;
};
