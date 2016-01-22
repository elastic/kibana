const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_type_registry').register({
  typeId: 'grok',
  title: 'Grok',
  sourceField: '',
  pattern: '',
  getDefinition: function() {
    const self = this;
    return {
      'grok' : {
        'processor_id': self.processorId,
        'field' : self.sourceField ? self.sourceField : '',
        'pattern': self.pattern ? self.pattern : '',
      }
    };
  },
  getDescription: function() {
    const self = this;

    let inputKeys = keysDeep(self.inputObject);
    let outputKeys = keysDeep(self.outputObject);
    let added = _.difference(outputKeys, inputKeys);

    let addedDescription = added.sort().map(field => `[${field}]`).join(', ');

    const source = (self.sourceField) ? self.sourceField : '?';
    return `[${source}] -> ${addedDescription}`;
  }
});

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
        pipeline.dirty = true;
      }

      $scope.$watch('processor.inputObject', consumeNewInputObject);

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        processorUiChanged();
      });

      $scope.$watch('processor.pattern', processorUiChanged);
    }
  }
});
