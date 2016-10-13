import uiModules from 'ui/modules';
import { flow, union, compact } from 'lodash';
import '../styles/_field_select.less';
import template from '../views/field_select.html';
import 'ui-select';

const app = uiModules.get('kibana');

app.directive('fieldSelect', function ($timeout) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processor: '=',
      field: '='
    },
    controller: function ($scope) {
      $scope.selected = { value: $scope.field };

      $scope.$watch('processor.suggestedFields', () => {
        $scope.fields = ($scope.processor.suggestedFields || []).sort();
      });

      $scope.$watch('selected.value', (newVal) => {
        $scope.field = newVal;
      });

      $scope.union = flow(union, compact);
    }
  };
});

app.directive('fieldSelectTweaks', function ($timeout) {
  return {
    restrict: 'A',
    link: function ($scope, $el) {
      $timeout(() => {
        $scope.$select.setFocus();
      });

      $scope.$watch('$select.open', function (isOpen) {
        if (isOpen) {
          $scope.$select.search = $scope.$select.selected;
        }
      });
    }
  };
});
