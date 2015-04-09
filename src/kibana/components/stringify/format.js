define(function (require) {
  return function BaseFormatProvider() {
    var _ = require('lodash');
    var angular = require('angular');

    function escape(v) {
      return typeof v === 'string' ? _.escape(v) : v;
    }

    return function format(fn) {
      return function convert(value) {
        if (_.isArray(value)) {
          return angular.toJson(_.map(value, convert));
        } else {
          return fn(escape(value));
        }
      };
    };
  };
});
