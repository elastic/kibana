let _ = require('lodash');

// Only applies to already resolved arguments
module.exports = function indexArguments(functionDef, orderedArgs) {

  let validateArg = require('./validate_arg')(functionDef);

  // This almost certainly is not required
  let allowedLength = functionDef.extended ? functionDef.args.length + 2 : functionDef.args.length;
  if (orderedArgs.length > allowedLength) throw new Error ('Too many arguments passed to: ' + functionDef.name);

  let indexedArgs = {};
  // Check and index each known argument
  _.each(functionDef.args, function (argDef, i) {
    let value = orderedArgs[i];
    validateArg(value, argDef.name, argDef);
    indexedArgs[argDef.name] = value;
  });

  // Also check and index the extended arguments if enabled
  if (functionDef.extended) {
    let values = orderedArgs[orderedArgs.length - 1];
    let names = orderedArgs[orderedArgs.length - 2];
    _.each(values, function (value, i) {
      validateArg(value, names[i], functionDef.extended);
      indexedArgs[names[i]] = value;
    });
  }

  return indexedArgs;
};
