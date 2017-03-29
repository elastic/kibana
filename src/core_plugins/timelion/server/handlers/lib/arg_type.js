import _ from 'lodash';

module.exports = function argType(arg) {
  if (_.isArray(arg)) {
    return _.chain(arg)
      .map(argType)
      .flattenDeep()
      .value();
  }

  if (_.isObject(arg) && arg) {
    return arg.type;
  }
  if (arg == null) {
    return 'null';
  }
  return typeof arg;
};
