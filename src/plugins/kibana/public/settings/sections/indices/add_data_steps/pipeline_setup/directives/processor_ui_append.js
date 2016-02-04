const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const keysDeep = require('../../../../../../../common/lib/keys_deep');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiAppend', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_append.html'),
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function processorUiChanged() {
        pipeline.dirty = true;
      }

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
      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watchCollection('processor.values', processorUiChanged);
    }
  };
});

