import uiModules from 'ui/modules';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiSet', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_set.html'),
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function processorUiChanged() {
        pipeline.dirty = true;
      }

      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.value', processorUiChanged);
    }
  };
});
