// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {
  var _ = require('lodash');

  require('modules')
  .get('kibana')
  .filter('matchAny', function () {
    return function (items, rules) {
      if (!_.isArray(rules)) {
        rules = [rules];
      }

      return _.filter(items, function (item) {
        for (var i = 0; i < rules.length; i++) {
          if (_.some([item], rules[i])) {
            return true;
          }
        }

        return false;
      });
    };
  });
});