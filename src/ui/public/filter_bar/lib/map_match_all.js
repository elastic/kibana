export function FilterBarLibMapMatchAllProvider(Promise) {
  return function (filter) {
    if (filter.match_all) {
      const type = 'match_all';
      const key = filter.meta.field;
      const value = filter.meta.formattedValue || 'all';
      return Promise.resolve({ type, key, value });
    }
    return Promise.reject(filter);
  };
}
