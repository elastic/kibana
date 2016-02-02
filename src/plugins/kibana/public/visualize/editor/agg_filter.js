define(function (require) {
  const _ = require('lodash');
  const propFilter = require('ui/filters/_prop_filter');

  require('ui/modules')
  .get('kibana')
  .filter('aggFilter', function () {
    return propFilter('name');
  });
});
