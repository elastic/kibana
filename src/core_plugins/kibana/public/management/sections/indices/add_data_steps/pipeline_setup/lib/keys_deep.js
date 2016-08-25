import _ from 'lodash';

export default function keysDeep(object, base) {
  let result = [];
  const delimitedBase = base ? base + '.' : '';

  _.forEach(object, (value, key) => {
    const fullKey = delimitedBase + key;
    if (_.isPlainObject(value)) {
      result = result.concat(keysDeep(value, fullKey));
    } else {
      result.push(fullKey);
    }
  });

  if (base) {
    result.push(base);
  }

  return result;
};
