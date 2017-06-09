export function FilterBarLibMapQueryStringProvider(Promise) {
  return function (filter) {
    if (filter.query && filter.query.query_string) {
      const type = 'query_string';
      const key = 'query';
      const value = filter.query.query_string.query;
      return Promise.resolve({ type, key, value });
    }
    return Promise.reject(filter);
  };
}
