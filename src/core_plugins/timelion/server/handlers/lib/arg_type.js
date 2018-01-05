import _ from 'lodash';

export default function argType(arg) {
  if (Array.isArray(arg)) {
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
}
