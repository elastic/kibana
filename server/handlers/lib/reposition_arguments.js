var _ = require('lodash');

// Applies to unresolved arguments in the AST
module.exports = function repositionArguments(functionDef, unorderedArgs) {
  var args = [];
  var extendedNames = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    var argDef;
    var targetIndex;
    var value;

    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {
      argDef = functionDef.argsByName[unorderedArg.name];

      if (!argDef) {
        if (functionDef.extended) {
          argDef = functionDef.extended;
          targetIndex = functionDef.args.length;
          extendedNames.push(unorderedArg.name);
        }
      } else {
        targetIndex = _.findIndex(functionDef.args, function (orderedArg) {
          return unorderedArg.name === orderedArg.name;
        });
      }

      value = unorderedArg.value;
    } else {
      argDef = functionDef.args[i];
      targetIndex = i;
      value = unorderedArg;
    }

    if (!argDef) throw new Error('Unknown argument to ' + functionDef.name + ': ' + (unorderedArg.name || ('#' + i)));

    if (argDef.multi) {
      args[targetIndex] = args[targetIndex] || [];
      args[targetIndex].push(value);
    } else {
      args[targetIndex] = value;
    }
  });

  if (functionDef.extended) args.extendedNames = extendedNames;
  return args;

};
