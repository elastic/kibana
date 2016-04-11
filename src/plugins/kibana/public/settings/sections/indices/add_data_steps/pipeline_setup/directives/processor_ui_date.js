import uiModules from 'ui/modules';
import template from '../views/processor_ui_date.html';
import _ from 'lodash';
import keysDeep from '../lib/keys_deep';
const createMultiSelectModel = require('../lib/create_multi_select_model');
import '../styles/_processor_ui_date.less';

const app = uiModules.get('kibana');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiDate', function () {
  return {
    restrict: 'E',
    template: template,
    controller : function ($scope, debounce) {
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

      const updateFormats = debounce(() => {
        processor.formats = _($scope.formats)
        .filter('selected')
        .map('title')
        .value();

        $scope.customFormatSelected = _.includes(processor.formats, 'Custom');
        processorUiChanged();
      }, 200);

      $scope.updateFormats = updateFormats;
      $scope.formats = createMultiSelectModel(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom'], processor.formats);

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.customFormat', updateFormats);
      $scope.$watch('processor.targetField', processorUiChanged);
      $scope.$watch('processor.timezone', processorUiChanged);
      $scope.$watch('processor.locale', processorUiChanged);
    }
  };
});
