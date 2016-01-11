const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'set',
  title: 'Set',
  template: '<processor-set></processor-set>',
  getDefinition: function() {
    const self = this;
    return {
      'set' : {
        'processor_id': self.processorId,
        'field' : self.targetField,
        'value': self.value
      }
    };
  },
  getDescription: function() {
    const self = this;

    const target = (self.targetField) ? self.targetField : '?';
    return `[${target}]`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorSet', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_set.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, processor.title, false);

      function consumeNewInputObject(event, message) {
        if (message.processor !== processor) return;

        logger.log('consuming new inputObject', processor.inputObject);

        $rootScope.$broadcast('processor_input_object_changed', { processor: processor });
      }

      function applyProcessor() {
        logger.log('processor properties changed. force update');
        $rootScope.$broadcast('processor_force_update', { processor: processor });
      }

      const inputObjectChangingListener = $scope.$on('processor_input_object_changing', consumeNewInputObject);

      $scope.$on('$destroy', () => {
        inputObjectChangingListener();
      });

      processor.targetField = '';
      processor.value = '';

      $scope.$watch('processor.targetField', applyProcessor);
      $scope.$watch('processor.value', applyProcessor);
    }
  }
});
