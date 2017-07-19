import { propFilter } from 'ui/filters/_prop_filter';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana')
.filter('aggFilter', function () {
  return propFilter('name');
});
