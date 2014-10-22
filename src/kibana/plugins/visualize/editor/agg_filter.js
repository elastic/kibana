// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .filter('aggFilter', function () {
      return function (aggs, names) {
        if (!names) return aggs;
        if (!_.isArray(names)) names = [names];
        if (_.contains(names, '*')) return aggs;

        var filters = names.map(function (name) {
          var filter = {
            match: true,
            name: name
          };

          if (name.charAt(0) === '!') {
            filter.match = false;
            filter.name = name.substr(1);
          }
          return filter;
        });

        return aggs.filter(function (agg) {
          for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            if ((agg.name === filter.name) === filter.match) return true;
          }
        });
      };
    });
});