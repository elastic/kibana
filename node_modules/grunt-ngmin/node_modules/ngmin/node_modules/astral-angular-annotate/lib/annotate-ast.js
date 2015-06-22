
var deepApply = require('./deep-apply');
var annotateInjectable = require('./annotate-injectable');


// look for `modRef.fn` in AST
var signatures = require('../signatures/simple');


/*
 * Modifies AST to add annotations to injectable AngularJS module methods
 */
var annotateAST = module.exports = function (syntax) {

  // rewrite each matching chunk
  deepApply(syntax, signatures, function (chunk) {
    var originalFn,
      newParam,
      type;

    try {
      type = chunk.callee.property.name;
    }
    catch (e) {}

    var argIndex = 1;
    if (type === 'config' || type === 'run') {
      argIndex = 0;
    }

    if (type === 'constant' || type === 'value') {
      return;
    }
    chunk.arguments[argIndex] = annotateInjectable(chunk.arguments[argIndex]);
  });

};
