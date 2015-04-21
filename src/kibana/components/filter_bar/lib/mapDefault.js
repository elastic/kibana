define(function (require) {
  return function mapDefaultProvider(Promise) {
    var angular = require('angular');
    var _ = require('lodash');

    return function (filter) {
      var key, value;
      if (filter.query) {
        key = 'query';
        value = angular.toJson(filter.query);
        return Promise.resolve({ key: key, value: value });
      } else {
        var displayFilter = _.clone(filter);
        delete displayFilter.meta;
        return Promise.resolve({ key: 'filter', value: angular.toJson(displayFilter)});
      }
      return Promise.reject(filter);
    };
  };
});
