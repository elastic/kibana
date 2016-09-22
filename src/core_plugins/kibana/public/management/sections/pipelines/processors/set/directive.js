import uiModules from 'ui/modules';
import template from './view.html';

const app = uiModules.get('kibana');

//scope.pipeline, scope.processor are attached by the process_container.
app.directive('processorUiSet', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.$watch('processor.targetField', () => { pipeline.setDirty(); });
      $scope.$watch('processor.value', () => { pipeline.setDirty(); });
      $scope.$watch('processor.override', () => { pipeline.setDirty(); });
    }
  };
});
