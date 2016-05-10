var _ = require('lodash');
var argType = require('./arg_type');

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, unorderedArgs) {

  if (unorderedArgs.length > functionDef.args.length) throw new Error ('Too many arguments passed to: ' + functionDef.name);

  // Validation, does not change the arguments
  _.each(unorderedArgs, function (arg, i) {
    var type = argType(arg);

    if (!functionDef.args[i]) {
      throw new Error ('Unknown argument #' + i + ' supplied to ' + functionDef.name);
    }

    var required = functionDef.args[i].types;
    var multi = functionDef.args[i].multi;
    var name = functionDef.args[i].name;

    var isCorrectType = (function () {
      // If argument is not allow to be specified multiple times, we're dealing with a plain value for type
      if (!multi) return _.contains(required, type);

      // If it is, we'll get an array for type
      return _.difference(type, required).length === 0;
    }());

    if (!isCorrectType) {
      console.log(type);
      throw new Error (functionDef.name + '(' + name + ') must be one of ' + JSON.stringify(required) + '. Got: ' + type);
    }
  });

  var indexedArgs = {};
  var argumentsDef = functionDef.args;

  _.each(unorderedArgs, function (unorderedArg, i) {
    if (!argumentsDef[i]) throw new Error ('Unknown argument #' + i + ' supplied to ' + functionDef.name);
    indexedArgs[argumentsDef[i].name] = unorderedArg;
  });

  return indexedArgs;
};
