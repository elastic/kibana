define(function (require) {
  return function mapDefaultProvider(Promise) {
    var angular = require('angular');

    return function (filter) {
      var key, value;
      if (filter.query) {
        key = 'query';
        value = angular.toJson(filter.query);
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
