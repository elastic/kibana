export function FilterBarLibMapValuesProvider(Promise) {
  return function (filter) {
    const { type, key, value, params } = filter.meta;
    if (type !== 'values') {
      return Promise.reject(filter);
    } else {
      return Promise.resolve({ type, key, value, params });
    }
  };
}
