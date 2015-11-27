define(function (require) {
  return function mapDefaultProvider(Promise) {
    var angular = require('angular');
    var _ = require('lodash');

    var metaProperty = /(^\$|meta)/;

    return function (filter) {
      var key = _.find(_.keys(filter), function (key) {
        return !key.match(metaProperty);
      });

      if (key) {
        var value = angular.toJson(filter[key]);
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
