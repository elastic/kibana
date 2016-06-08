import uiModules from 'ui/modules';
import template from '../views/ignore_failure_select.html';

const app = uiModules.get('kibana');

app.directive('ignoreFailureSelect', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      value: '='
    },
    controller: function ($scope) {
      $scope.options = [
        { label: 'Ignore, and index document', value: true },
        { label: 'Do not index document', value: false }
      ];
    }
  };
});
