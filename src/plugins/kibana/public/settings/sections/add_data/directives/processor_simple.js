const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

//scope.processor is attached by the wrapper.
app.directive('processorSimple', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_simple.html'),
    controller : function ($scope, $rootScope, $timeout) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorSimple', true);

      function checkForNewInputObject() {
        logger.log('consuming new inputObject');
      }

      function applyProcessor() {
        checkForNewInputObject();

        logger.log('I am processing!');
        $rootScope.$broadcast('processor_started', { processor: processor });

        //this is just here to simulate an async process.
        $timeout(function() {
          //each processor will generate it's own output object
          let output = _.cloneDeep(processor.inputObject);
          let key = `processor_${processor.processorId}_field`;
          let value = new Date().toString();
          _.set(output, key, value);

          //each processor will generate it's own description
          let description = `Simple Processor - Added ${key}`;

          const message = {
            processor: processor,
            output: output,
            description: description
          };

          logger.log('I am DONE processing!');
          $rootScope.$broadcast('processor_finished', message);
        }, 0);
      }

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.$on('$destroy', () => {
        startListener();
      });

      //internal only (linked to the button, no other use, for debug only)
      //this would be logic that would be triggered from any processor
      //specific state changes like selectedfield or expression, etc
      $scope.update = function() {
        applyProcessor();
      }
    }
  }
});

