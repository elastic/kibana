define(function (require) {
  return function mapMissingProvider(Promise) {
    return function (filter) {
      var key, value;
      if (filter.missing) {
        key = 'missing';
        value = filter.missing.field;
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
