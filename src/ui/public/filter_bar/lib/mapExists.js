define(function (require) {
  return function mapExistsProvider(Promise) {
    return function (filter) {
      let key;
      let value;
      if (filter.exists) {
        key = 'exists';
        value = filter.exists.field;
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
