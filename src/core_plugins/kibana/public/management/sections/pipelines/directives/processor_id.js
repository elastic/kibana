import uiModules from 'ui/modules';
import template from '../views/processor_id.html';

const app = uiModules.get('kibana');

app.directive('processorId', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processor: '='
    },
    controller: function ($scope) {
      $scope.$watch('processor.processorId', () => {
        const processor = $scope.processor;
      });
    }
  };
});
