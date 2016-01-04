const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');

//scope.processor is attached by the wrapper.
app.directive('processorRegex', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_regex.html'),
    controller : function ($scope, $rootScope, $timeout, debounce) {
      const processor = $scope.processor;
      const Logger = require('../lib/logger');
      const logger = new Logger(processor, 'processorRegex', true);

      function getDescription() {
        const source = ($scope.sourceField) ? $scope.sourceField : '?';
        const target = ($scope.targetField) ? $scope.targetField : '?';
        return `RegEx - [${source}] -> [${target}]`;
      }

      function checkForNewInputObject() {
        //debugger;
        logger.log('consuming new inputObject', processor.inputObject);
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
      }

      function applyProcessor() {
        checkForNewInputObject();

        logger.log('I am processing!');
        $rootScope.$broadcast('processor_started', { processor: processor });

        //this is just here to simulate an async process.
        $timeout(function() {
          const output = _.cloneDeep(processor.inputObject);
          const key = $scope.targetField;
          const description = getDescription();

          if ($scope.expression && $scope.targetField && $scope.sourceField) {
            let matches = [];
            try {
              const regex = new RegExp($scope.expression, 'ig');
              matches = $scope.fieldData.match(regex);
            } catch(err) {
            }

            if (matches) {
              if (matches.length === 1) {
                _.set(output, key, matches[0]);
              } else {
                _.set(output, key, matches);
              }
            } else {
              _.set(output, key, '');
            }
          }

          const message = {
            processor: processor,
            output: output,
            description: description
          };

        logger.log('I am DONE processing!');
          $rootScope.$broadcast('processor_finished', message);
        }, 0);
      }
      applyProcessor = debounce(applyProcessor, 200);

      function processorStart(event, message) {
        if (message.processor !== processor) return;

        applyProcessor();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get(processor.inputObject, $scope.sourceField);
      }

      const startListener = $scope.$on('processor_start', processorStart);

      $scope.expression = '^[0-3]?[0-9]/[0-3]?[0-9]/(?:[0-9]{2})?[0-9]{2}';
      $scope.targetField = '';

      $scope.$on('$destroy', () => {
        startListener();
      });

      $scope.$watch('sourceField', () => {
        refreshFieldData();
        applyProcessor();
      });

      $scope.$watch('targetField', applyProcessor);
      $scope.$watch('expression', applyProcessor);
    }
  }
});

