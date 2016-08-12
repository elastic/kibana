var _ = require('lodash');

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, orderedArgs) {

  var validateArg = require('./validate_arg')(functionDef);

  // This almost certainly is not required
  var allowedLength = functionDef.extended ? functionDef.args.length + 2 : functionDef.args.length;
  if (orderedArgs.length > allowedLength) throw new Error ('Too many arguments passed to: ' + functionDef.name);

  var indexedArgs = {};
  // Check and index each known argument
  _.each(functionDef.args, function (argDef, i) {
    var value = orderedArgs[i];
    validateArg(value, argDef.name, argDef);
    indexedArgs[argDef.name] = value;
  });

  // Also check and index the extended arguments if enabled
  if (functionDef.extended) {
    var values = orderedArgs[orderedArgs.length - 1];
    var names = orderedArgs[orderedArgs.length - 2];
    _.each(values, function (value, i) {
      validateArg(value, names[i], functionDef.extended);
      indexedArgs[names[i]] = value;
    });
  }

  return indexedArgs;
};
