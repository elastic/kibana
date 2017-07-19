export function FilterBarLibMapExistsProvider(Promise) {
  return function (filter) {
    if (filter.exists) {
      const type = 'exists';
      const key = filter.exists.field;
      const value = type;
      return Promise.resolve({ type, key, value });
    }
    return Promise.reject(filter);
  };
}
