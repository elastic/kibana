define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  return function format(fn) {
    return function (value) {
      if (_.isArray(value)) {
        return angular.toJson(_.map(value, fn));
      } else {
        return fn(value);
      }
    };
  };
});