define(function (require) {
  var _ = require('lodash');
  var propFilter = require('filters/_prop_filter');

  require('modules')
  .get('kibana')
  .filter('aggFilter', function () {
    return propFilter('name');
  });
});