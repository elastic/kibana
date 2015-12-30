const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

//scope.processor is attached by the wrapper.
app.directive('processorOneField', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_one_field.html'),
    controller : function ($scope, $rootScope, $timeout) {
      const processor = $scope.processor;

      function applyProcessor() {
        $rootScope.$broadcast('processor_started', { processor: processor });

        //this is just here to simulate an async process.
        $timeout(function() {
          //each processor will generate it's own output object
          let output = _.cloneDeep(processor.inputObject);
          let key = `processor_${processor.processorId}_field`;
          let value = `I selected the field ${$scope.sourceField}`;
          _.set(output, key, value);

          //each processor will generate it's own description
          let description = `One Field Processor - Added ${key}`;

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

      $scope.$watch('processor.inputObject', function() {
        $scope.fields = keysDeep(processor.inputObject);
      });

      $scope.$watch('sourceField', applyProcessor);
    }
  }
});

