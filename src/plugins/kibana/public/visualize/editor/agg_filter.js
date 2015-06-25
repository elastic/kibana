define(function (require) {
  var _ = require('lodash');
  var propFilter = require('ui/filters/_prop_filter');

  require('modules')
  .get('kibana')
  .filter('aggFilter', function () {
    return propFilter('name');
  });
});