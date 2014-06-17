// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana/filters')
    .filter('fieldType', function () {
      return function (arr, type) {
        if (type === '*') return arr;

        if (_.isArray(type)) {
          if (_.contains(type, '*')) return arr;
          return _.filter(arr, function (field) {
            return _.contains(type, field.type);
          });
        }

        return arr && arr.filter(function (field) {
          return (field.type === type);
        });
      };
    });
});