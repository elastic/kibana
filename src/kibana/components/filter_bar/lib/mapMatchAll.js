define(function (require) {
  return function mapMatchAllProvider(Promise) {
    return function (filter) {
      if (filter.match_all) {
        var key = filter.meta.field;
        var value = filter.meta.formattedValue || 'all';
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
