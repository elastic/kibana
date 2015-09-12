var _ = require('lodash');

// This BS is why I need an argument object
function argType(arg) {
  if (_.isObject(arg) && arg) {
    return arg.type;
  }
  if (arg == null) {
    return 'null';
  }
  return typeof arg;
}

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, unorderedArgs) {

  if (unorderedArgs.length > functionDef.args.length) throw new Error ('Too many arguments passed to: ' + functionDef.name);

  // Validation, does not change the arguments
  _.each(unorderedArgs, function (arg, i) {
    var type = argType(arg);
    var required = functionDef.args[i].types;
    var name = functionDef.args[i].name;

    if (!(_.contains(required, type))) {
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