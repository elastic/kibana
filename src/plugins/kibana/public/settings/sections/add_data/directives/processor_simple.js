const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');

//THIS IS THE SCOPE OF THE INDIVIDUAL PROCESSORS.
//scope.processor is attached by the wrapper.
app.directive('processorSimple', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_simple.html'),
    controller : function ($scope, $rootScope, $timeout) {
      const processor = $scope.processor;

      function applyProcessor() {
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

          $rootScope.$broadcast('processor_finished', message);
        }, 100);
      }

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      //internal only (linked to the button, no other use, for debug only)
      //this would be logic that would be triggered from any processor
      //specific state changes like selectedfield or expression, etc
      $scope.update = function() {
        applyProcessor();
      }

      $scope.$on('$destroy', () => {
        startListener();
      });
    }
  }
});

