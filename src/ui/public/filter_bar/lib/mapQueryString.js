define(function (require) {
  return function mapQueryStringProvider(Promise) {
    return function (filter) {
      var key, value;
      if (filter.query && filter.query.query_string) {
        key = 'query';
        value = filter.query.query_string.query;
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
