var _ = require('lodash');

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, unorderedArgs) {
  var indexedArgs = {};
  var argumentsDef = functionDef.args;


  _.each(unorderedArgs, function (unorderedArg, i) {
    if (!argumentsDef[i]) throw new Error ('Unknown argument #' + i + ' supplied to ' + functionDef.name);
    indexedArgs[argumentsDef[i].name] = unorderedArg;
  });

  return indexedArgs;
};