define(function (require) {
  return function mapDefaultProvider(Promise) {
    let angular = require('angular');
    let _ = require('lodash');

    let metaProperty = /(^\$|meta)/;

    return function (filter) {
      let key = _.find(_.keys(filter), function (key) {
        return !key.match(metaProperty);
      });

      if (key) {
        let value = angular.toJson(filter[key]);
        return Promise.resolve({ key: key, value: value });
      }
      return Promise.reject(filter);
    };
  };
});
