import _ from 'lodash';
import propFilter from '../../../../../ui/public/filters/_prop_filter';
import uiModules from '../../../../../ui/public/modules';

uiModules
.get('kibana')
.filter('aggFilter', function () {
  return propFilter('name');
});
