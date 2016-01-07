const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'append',
  title: 'Append',
  template: '<processor-append></processor-append>',
  getDefinition: function() {
    const self = this;
    return {
      'set' : {
        'field' : self.targetField,
        'value': self.values
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
app.directive('processorAppend', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_append.html'),
    controller : function ($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;

      function getDescription() {
        const target = (processor.targetField) ? processor.targetField : '?';
        return `Append - [${target}]`;
      }

      function checkForNewInputObject() {
      }

      function applyProcessor() {
        checkForNewInputObject();

        $rootScope.$broadcast('processor_started', { processor: processor });

        let output;
        const description = processor.getDescription();

        ingest.simulate(processor)
        .then(function (result) {
          if (!result) {
            output = _.cloneDeep(processor.inputObject);
          } else {
            output = result;
          }

          const message = {
            processor: processor,
            output: output,
            description: description
          };

          $rootScope.$broadcast('processor_finished', message);
        });
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      const startListener = $scope.$on('processor_start', processorStart);

      processor.targetField = '';
      processor.values = [];

      $scope.$on('$destroy', () => {
        startListener();
      });

      $scope.$watch('processor.targetField', applyProcessor);
      $scope.$watchCollection('processor.values', applyProcessor);
      //$scope.$watch('processor.values', applyProcessor);
    }
  }
});

