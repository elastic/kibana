var _ = require('lodash');

// Applies to unresolved arguments in the AST
module.exports = function repositionArguments(functionDef, unorderedArgs) {
  var args = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {

      var argIndex = _.findIndex(functionDef.args, function (orderedArg) {
        return unorderedArg.name === orderedArg.name;
      });

      args[argIndex] = unorderedArg.value;
    } else {
      args[i] = unorderedArg;
    }
  });

  return args;

};