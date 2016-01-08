const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
require('../services/ingest');

require('../lib/processor_registry').register({
  typeid: 'grok',
  title: 'Grok',
  template: '<processor-grok></processor-grok>',
  getDefinition: function() {
    const self = this;
    return {
      'grok' : {
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
app.directive('processorGrok', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_grok.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorGrok', true);

      function consumeNewInputObject(event, message) {
        if (message.processor !== processor) return;

        logger.log('consuming new inputObject', processor.inputObject);
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();

        $rootScope.$broadcast('processor_input_object_changed', { processor: processor });
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, processor.sourceField);
      }

      function applyProcessor() {
        logger.log('processor properties changed. force update');
        $rootScope.$broadcast('processor_force_update', { processor: processor });
      }

      const inputObjectChangingListener = $scope.$on('processor_input_object_changing', consumeNewInputObject);

      $scope.$on('$destroy', () => {
        inputObjectChangingListener();
      });

      processor.pattern = '';

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('processor.pattern', applyProcessor);
    }
  }
});
