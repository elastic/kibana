import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import template from './filter_operator_select.html';

const module = uiModules.get('kibana');
module.directive('filterOperatorSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      operator: '=',
      operatorOptions: '=',
      onSelect: '&'
    }
  };
});
