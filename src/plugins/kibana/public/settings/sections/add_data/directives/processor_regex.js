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

      function getDescription() {
        const source = ($scope.sourceField) ? $scope.sourceField : '?';
        const target = ($scope.targetField) ? $scope.targetField : '?';
        return `RegEx - [${source}] -> [${target}]`;
      }

      function applyProcessor() {
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

          $rootScope.$broadcast('processor_finished', message);
        }, 100);
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


      // function parentUpdated(event, message) {
      //   debugger;
      //   if (message.processor !== processor.parent) return;

      //   console.log(processor.processorId, 'I should update my state because my parent updated.');
      // }

      // const finishedListener = $scope.$on('processor_finished', parentUpdated);

      // $scope.$on('$destroy', () => {
      //   finishedListener();
      // });

      $scope.$watch('processor.inputObject', function() {
        $scope.fields = keysDeep(processor.inputObject);
        refreshFieldData();
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

