const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const keysDeep = require('../lib/keys_deep');

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
