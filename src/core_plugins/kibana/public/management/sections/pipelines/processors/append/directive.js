import uiModules from 'ui/modules';
import template from './view.html';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiAppend', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function splitValues(delimitedList) {
        return delimitedList.split('\n');
      }

      function joinValues(valueArray) {
        return valueArray.join('\n');
      }

      function updateValues() {
        processor.values = splitValues($scope.values);
      }

      $scope.values = joinValues(processor.values);

      $scope.$watch('values', updateValues);
      $scope.$watch('processor.targetField', () => { pipeline.setDirty(); });
      $scope.$watchCollection('processor.values', () => { pipeline.setDirty(); });
    }
  };
});
