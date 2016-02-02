const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const keysDeep = require('../../../../../../../lib/keys_deep');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiJoin', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_join.html'),
    controller : function ($scope) {
      const processor = $scope.processor;
      const pipeline = $scope.pipeline;

      function consumeNewInputObject() {
        const allKeys = keysDeep(processor.inputObject);
        const keys = [];
        allKeys.forEach((key) => {
          if (_.isArray(_.get(processor.inputObject, key))) {
            keys.push(key);
          }
        });
        $scope.fields = keys;
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function processorUiChanged() {
        pipeline.currentProcessorId = processor.processorId;
        pipeline.dirty = true;
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.separator', processorUiChanged);
    }
  };
});
