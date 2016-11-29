var _ = require('lodash');

module.exports = function (func) {
  var functions = {};
  functions[func.name] = func;
  if (func.aliases) {
    _.each(func.aliases, function (alias) {
      var aliasFn = _.clone(func);
      aliasFn.isAlias = true;
      functions[alias] = aliasFn;
    });
  }

  return functions;
};
