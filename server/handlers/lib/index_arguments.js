var _ = require('lodash');
var argType = require('./arg_type');

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, orderedArgs, extendedNames) {

  console.log(orderedArgs);

  var allowedLength = functionDef.extended ? functionDef.args.length + 1 : functionDef.args.length;

  if (orderedArgs.length > allowedLength) throw new Error ('Too many arguments passed to: ' + functionDef.name);

  // Validation, does not change the arguments
  _.each(orderedArgs, function (arg, i) {
    var type = argType(arg);
    var argDef = functionDef.args[i];

    if (!argDef) {
      if (functionDef.extended) {
        throw new Error ('Extended is not yet implemented');
        argDef = functionDef.extended;
      } else {
        throw new Error ('Unknown argument #' + i + ' supplied to ' + functionDef.name);
      }
    }

    var required = argDef.types;
    var multi = argDef.multi;
    var name = argDef.name;

    var isCorrectType = (function () {
      // If argument is not allow to be specified multiple times, we're dealing with a plain value for type
      if (!multi) return _.contains(required, type);

      // If it is, we'll get an array for type
      return _.difference(type, required).length === 0;
    }());

    if (!isCorrectType) {
      throw new Error (functionDef.name + '(' + name + ') must be one of ' + JSON.stringify(required) + '. Got: ' + type);
    }
  });

  var indexedArgs = {};
  var argumentsDef = functionDef.args;

  _.each(orderedArgs, function (unorderedArg, i) {
    if (!argumentsDef[i]) throw new Error ('Unknown argument #' + i + ' supplied to ' + functionDef.name);
    indexedArgs[argumentsDef[i].name] = unorderedArg;
  });

  return indexedArgs;
};
