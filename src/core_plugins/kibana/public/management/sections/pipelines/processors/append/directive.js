import uiModules from 'ui/modules';
import template from './view.html';
import 'ui/pipelines/list_textarea';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiAppend', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      $scope.$watch('processor.targetField', () => { pipeline.setDirty(); });
      $scope.$watchCollection('processor.values', () => { pipeline.setDirty(); });
    }
  };
});
