const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'join',
  title: 'Join',
  template: '<processor-join></processor-join>',
  getDefinition: function() {
    const self = this;
    return {
      'join' : {
        'field' : self.sourceField,
        'separator' : self.separator
      }
    };
  },
  getDescription: function() {
    const self = this;

    const source = (self.sourceField) ? self.sourceField : '?';
    const separator = (self.separator) ? self.separator : '?';
    return `[${source}] on '${separator}'`;
  }
});

//scope.processor is attached by the process_container.
app.directive('processorJoin', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_join.html'),
    controller : function ($scope, $rootScope, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, processor.title, false);

      function consumeNewInputObject(event, message) {
        if (message.processor !== processor) return;

        logger.log('consuming new inputObject', processor.inputObject);

        const allKeys = keysDeep(processor.inputObject);
        const keys = [];
        allKeys.forEach((key) => {
          if (_.isArray(_.get(processor.inputObject, key))) {
            keys.push(key);
          }
        })
        $scope.fields = keys;
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

      processor.separator = '';

      $scope.$watch('processor.sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('processor.separator', applyProcessor);
    }
  }
});
