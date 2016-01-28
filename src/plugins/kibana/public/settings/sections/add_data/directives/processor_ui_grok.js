const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

//scope.processor, scope.pipeline are attached by the process_container.
app.directive('processorUiGrok', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_grok.html'),
    controller : function ($scope, $rootScope, debounce) {
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
        pipeline.currentProcessorId = processor.processorId;
        pipeline.dirty = true;
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.pattern', processorUiChanged);

      $scope.debug = function() {
        const samples = [
          '%{GREEDYDATA:source} - - %{GREEDYDATA:message}',
          '\\[%{GREEDYDATA:datestamp}] "%{WORD:action} %{GREEDYDATA:document} %{GREEDYDATA:protocol}" %{WORD:response_code} %{WORD:extended_response_code}',
          '%{GREEDYDATA:timestamp} %{GREEDYDATA:timezone}'
        ];

        let index = _.indexOf(samples, processor.pattern);
        index += 1;
        if (index >= samples.length) index = 0;

        processor.pattern = samples[index];
      }
    }
  }
});
