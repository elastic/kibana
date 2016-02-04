const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const keysDeep = require('../../../../../../../common/lib/keys_deep');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiLowercase', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_lowercase.html'),
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function consumeNewInputObject() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        pipeline.dirty = true;
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });
    }
  };
});
