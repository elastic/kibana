// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .filter('fieldType', function () {
      return function (fields, types) {
        if (!types) return fields;
        if (!_.isArray(types)) types = [types];
        if (_.contains(types, '*')) return fields;

        var filters = types.map(function (type) {
          var filter = {
            match: true,
            type: type
          };

          if (type.charAt(0) === '!') {
            filter.match = false;
            filter.type = type.substr(1);
          }
          return filter;
        });

        return fields.filter(function (field) {
          for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            if ((field.type === filter.type) === filter.match) return true;
          }
        });
      };
    });
});