import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import template from './filter_field_select.html';
import '../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterFieldSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      fieldOptions: '=',
      onSelect: '&'
    }
  };
});
