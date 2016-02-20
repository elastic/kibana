var _ = require('lodash');

module.exports = function argType(arg) {
  if (_.isObject(arg) && arg) {
    return arg.type;
  }
  if (arg == null) {
    return 'null';
  }
  return typeof arg;
};
