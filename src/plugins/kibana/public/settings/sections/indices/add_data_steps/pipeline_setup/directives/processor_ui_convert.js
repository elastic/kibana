import uiModules from 'ui/modules';
import template from '../views/processor_ui_convert.html';
import _ from 'lodash';
import keysDeep from '../lib/keys_deep';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiConvert', function () {
  return {
    restrict: 'E',
    template: template,
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
        pipeline.setDirty();
      }

      $scope.types = ['auto', 'number', 'string', 'boolean'];

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        if (_.isEmpty($scope.processor.targetField)) {
          $scope.processor.targetField = $scope.processor.sourceField;
        }
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.type', processorUiChanged);
      $scope.$watch('processor.targetField', processorUiChanged);
    }
  };
});
