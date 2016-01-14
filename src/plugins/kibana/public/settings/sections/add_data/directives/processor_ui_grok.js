const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_registry').register({
  typeid: 'grok',
  title: 'Grok',
  template: '<processor-ui-grok></processor-ui-grok>',
  getDefinition: function() {
    const self = this;
    return {
      'grok' : {
        'processor_id': self.processorId,
        'field' : self.sourceField,
        'pattern': self.pattern
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

//scope.processor is attached by the process_container.
app.directive('processorUiGrok', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_ui_grok.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;

      const Logger = require('../lib/logger');
      const logger = new Logger(`processor_ui_grok(${processor.processorId})`, true);

      function consumeNewInputObject() {
        logger.log('consumeNewInputObject', processor);

        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();

        //this is where we fired the processor_input_object_changed event
        //$rootScope.$broadcast('processor_input_object_changed', { processor: processor });
      }

      function refreshFieldData() {
        logger.log('refreshFieldData', processor);
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function applyProcessor() {
        logger.log('applyProcessor', processor);
        // $rootScope.$broadcast('processor_force_update', { processor: processor });
      }

      processor.sourceField = '';
      processor.pattern = '';

      $scope.$watch('processor.inputObject', () => {
        logger.log('$watch processor.inputObject', processor.inputObject);
        consumeNewInputObject();
      });

      $scope.$watch('processor.sourceField', () => {
        logger.log('$watch processor.sourceField', processor.sourceField);
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('processor.pattern', () => {
        logger.log('$watch processor.pattern', processor.pattern);
        applyProcessor();
      });
    }
  }
});
