let _ = require('lodash');

module.exports = function (func) {
  let functions = {};
  functions[func.name] = func;
  if (func.aliases) {
    _.each(func.aliases, function (alias) {
      let aliasFn = _.clone(func);
      aliasFn.isAlias = true;
      functions[alias] = aliasFn;
    });
  }

  return functions;
};
