export function FilterBarLibMapMissingProvider(Promise) {
  return function (filter) {
    if (filter.missing) {
      const type = 'missing';
      const key = filter.missing.field;
      const value = type;
      return Promise.resolve({ type, key, value });
    }
    return Promise.reject(filter);
  };
}
