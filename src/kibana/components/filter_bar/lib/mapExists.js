define(function (require) {
  return function mapExistsProvider(Promise) {
    return function (filter) {
      var key, value;
      if (filter.exists) {
        key = 'exists';
        value = filter.exists.field;
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
