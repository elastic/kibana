var _ = require('lodash');

// Applies to unresolved arguments in the AST
module.exports = function repositionArguments(functionDef, unorderedArgs) {
  var args = [];

  _.each(unorderedArgs, function (unorderedArg, i) {
    var argDef;
    var targetIndex;
    var value;
    var storeAsArray;

    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {
      argDef = functionDef.argsByName[unorderedArg.name];

      if (!argDef) {
        if (functionDef.extended) {
          var namesIndex = functionDef.args.length;
          targetIndex = functionDef.args.length + 1;

          args[namesIndex] = args[namesIndex] || [];
          args[namesIndex].push(unorderedArg.name);

          argDef = functionDef.extended;
          storeAsArray = true;
        }
      } else {
        targetIndex = _.findIndex(functionDef.args, function (orderedArg) {
          return unorderedArg.name === orderedArg.name;
        });
        storeAsArray = argDef.multi;

      }
      value = unorderedArg.value;
    } else {
      argDef = functionDef.args[i];
      storeAsArray = argDef.multi;
      targetIndex = i;
      value = unorderedArg;
    }

    if (!argDef) throw new Error('Unknown argument to ' + functionDef.name + ': ' + (unorderedArg.name || ('#' + i)));

    if (storeAsArray) {
      args[targetIndex] = args[targetIndex] || [];
      args[targetIndex].push(value);
    } else {
      args[targetIndex] = value;
    }
  });

  return args;

};
