var _ = require('lodash');

// Applies to unresolved arguments in the AST
module.exports = function repositionArguments(functionDef, unorderedArgs) {
  var args = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    var argDef;
    var targetIndex;
    var value;

    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {
      var argIndex = _.findIndex(functionDef.args, function (orderedArg) {
        return unorderedArg.name === orderedArg.name;
      });
      argDef = functionDef.args[argIndex];

      if (!argDef) {
        throw new Error('Unknown argument to ' + functionDef.name + ': ' + unorderedArg.name);
      }

      targetIndex = argIndex;
      value = unorderedArg.value;
    } else {
      argDef = functionDef.args[i];
      targetIndex = i;
      value = unorderedArg;
    }

    if (argDef.multi) {
      args[targetIndex] = args[targetIndex] || [];
      args[targetIndex].push(value);
    } else {
      args[targetIndex] = value;
    }
  });

  return args;

};
