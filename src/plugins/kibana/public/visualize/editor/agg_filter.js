import _ from 'lodash';
import propFilter from 'ui/filters/_prop_filter';
define(function (require) {

  require('ui/modules')
  .get('kibana')
  .filter('aggFilter', function () {
    return propFilter('name');
  });
});
