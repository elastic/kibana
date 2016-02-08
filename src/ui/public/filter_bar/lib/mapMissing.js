export default function mapMissingProvider(Promise) {
  return function (filter) {
    var key;
    var value;
    if (filter.missing) {
      key = 'missing';
      value = filter.missing.field;
      return Promise.resolve({ key: key, value: value });
    }
    return Promise.reject(filter);
  };
};
