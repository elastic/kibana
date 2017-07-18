import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import { getFieldOptions } from './lib/filter_editor_utils';
import template from './filter_field_select.html';
import '../directives/ui_select_focus_on';
import '../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterFieldSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      field: '=',
      onSelect: '&'
    },
    link: function ($scope) {
      $scope.$watch('indexPatterns', (indexPatterns) => {
        $scope.fieldOptions = getFieldOptions(indexPatterns);
      });
    }
  };
});
