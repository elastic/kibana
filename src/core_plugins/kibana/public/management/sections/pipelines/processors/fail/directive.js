import uiModules from 'ui/modules';
import template from './view.html';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiFail', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.$watch('processor.message', () => { pipeline.setDirty(); });
    }
  };
});
