var _ = require('lodash');

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


  /*
  var indexedArgs = {};
  _.each(unorderedArgs, function (unorderedArg, i) {
    if (_.isObject(unorderedArg) && unorderedArg.type === 'namedArg') {
      indexedArgs[unorderedArg.name] = unorderedArg.value;
    } else {
      if (functionDef.args[i]) {
        indexedArgs[functionDef.args[i].name] = unorderedArg;
      } else {
        throw new Error ('Too many unnamed arguments supplied to: ' + functionDef.name);
      }
    }
  });

  return indexedArgs;
  */
};