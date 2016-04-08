import uiModules from 'ui/modules';
import template from '../views/processor_ui_date.html';
import _ from 'lodash';
import keysDeep from '../lib/keys_deep';
import selectableArray from '../lib/selectable_array';
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

      function updateFormats() {
        const selectedFormats = $scope.formats.map((o) => {
          if (!o.selected) return;
          return o.title;
        });
        processor.formats = _.compact(selectedFormats);

        $scope.customFormatSelected = !_.isUndefined(_.find(processor.formats, (o) => {
          return o === 'Custom';
        }));
        processorUiChanged();
      }
      updateFormats = debounce(updateFormats, 200);

      $scope.formats = selectableArray(['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N', 'Custom'], processor.formats);
      $scope.updateFormats = updateFormats;

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
