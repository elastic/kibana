const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

require('../lib/processor_registry').register({
  typeid: 'set',
  title: 'Set',
  template: '<processor-set></processor-set>'
});

//scope.processor is attached by the process_container.
app.directive('processorSet', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_set.html'),
    controller : function ($scope, $rootScope, debounce, ingest) {
      const processor = $scope.processor;

      function getDescription() {
        const target = (processor.targetField) ? processor.targetField : '?';
        return `Set - [${target}]`;
      }

      function checkForNewInputObject() {
      }

      function applyProcessor() {
        checkForNewInputObject();

        $rootScope.$broadcast('processor_started', { processor: processor });

        let output;
        const description = getDescription();

        ingest.simulate(processor)
        .then(function (result) {
          //TODO: this flow needs to be streamlined
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
      processor.value = '';

      $scope.$on('$destroy', () => {
        startListener();
      });

      $scope.$watch('processor.targetField', applyProcessor);
      $scope.$watch('processor.value', applyProcessor);
    }
  }
});

