import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import { getOperatorOptions } from './lib/filter_editor_utils';
import template from './filter_operator_select.html';
import '../directives/ui_select_focus_on';

const module = uiModules.get('kibana');
module.directive('filterOperatorSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      operator: '=',
      onSelect: '&'
    },
    link: function ($scope) {
      $scope.$watch('field', (field) => {
        $scope.operatorOptions = getOperatorOptions(field);
      });
    }
  };
});
