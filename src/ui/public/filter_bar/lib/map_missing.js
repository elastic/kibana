export function FilterBarLibMapMissingProvider(Promise) {
  return function (filter) {
    let key;
    let value;
    if (filter.missing) {
      key = 'missing';
      value = filter.missing.field;
      return Promise.resolve({ key: key, value: value });
    }
    return Promise.reject(filter);
  };
}
