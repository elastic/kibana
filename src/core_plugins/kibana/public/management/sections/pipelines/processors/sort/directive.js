import uiModules from 'ui/modules';
import template from './view.html';

const app = uiModules.get('kibana');

//scope.pipeline, scope.processor are attached by the process_container.
app.directive('processorUiSort', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.sortOrders = {
        asc: 'Ascending',
        desc: 'Descending'
      };

      $scope.$watch('processor.targetField', () => { pipeline.setDirty(); });
      $scope.$watch('processor.sortOrder', () => { pipeline.setDirty(); });
    }
  };
});
