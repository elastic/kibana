define(function (require) {
  return function mapMatchAllProvider(Promise) {
    return function (filter) {
      if (filter.match_all) {
        const key = filter.meta.field;
        const value = filter.meta.formattedValue || 'all';
        return Promise.resolve({ key, value });
      }
      return Promise.reject(filter);
    };
  };
});
