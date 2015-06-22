
// given an AST chunk for a fn,
// return an AST chunk representing an annotation array
var annotateInjectable = module.exports = function (originalFn) {
  // if there's nothing to inject, don't annotate
  if (!originalFn.params || originalFn.params.length === 0) {
    return originalFn;
  }

  var newParam = {
    type: 'ArrayExpression',
    elements: []
  };

  originalFn.params.forEach(function (param) {
    newParam.elements.push({
      "type": "Literal",
      "value": param.name
    });
  });
  newParam.elements.push(originalFn);
  return newParam;
};
