const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'lowercase',
  title: 'Lowercase',
  template: '<processor-lowercase></processor-lowercase>',
  getDefinition: function() {
    const self = this;
    return {
      'lowercase' : {
        'processor_id': self.processorId,
        'field' : self.sourceField
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    return `[${source}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorLowercase', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_lowercase.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, processor.title, false);

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

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });
    }
  }
});
