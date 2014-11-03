// Gets all fields of a given type.
// You may also pass "*" to get all types
// Or an array of types to get all fields of that type
define(function (require) {
  var _ = require('lodash');
  var propFilter = require('filters/_prop_filter');

  require('modules')
  .get('kibana')
  .filter('fieldType', function () {
    return propFilter('type');
  });
});