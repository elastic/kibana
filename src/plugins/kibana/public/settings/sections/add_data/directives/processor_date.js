const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('processorDate', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_date.html'),
    controller: function ($scope, debounce, Promise, $timeout) {

      //this occurs when the parent processor changes it's output object,
      //which means that this processor's input object is changing.
      function refreshFields() {
        if ($scope.manager.updatePaused) return;

        objectManager.mutateClone($scope.outputObject, $scope.inputObject);
        $scope.fields = keysDeep($scope.inputObject);

        console.log($scope.processor.processorId, $scope.fields);

        if (!_.contains($scope.fields, $scope.sourceField)) {
          $scope.sourceField = $scope.fields[0];
        }
        refreshFieldData();
        refreshOutput();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get($scope.inputObject, $scope.sourceField);
      }
      refreshFieldData = debounce(refreshFieldData, 100);

      function getProcessorOutput() {
        return new Promise(function(resolve, reject) {
          const processorOutput = {};

          if (!$scope.targetField)
            resolve();

          $timeout(function() {
            let result;

            let temp = new Date($scope.fieldData);
            if (!isNaN( temp.getTime())) {
              result = temp;
            }

            if (result) {
              _.set(processorOutput, $scope.targetField, result);
            } else {
              _.set(processorOutput, $scope.targetField, '');
            }

            resolve(processorOutput);
          }, 0);
        });
      }

      function getDescription() {
        return `Date [${$scope.sourceField}] -> [${$scope.targetField}]`;
      }

      function refreshOutput() {
        $scope.processorDescription = getDescription();

        getProcessorOutput()
        .then((processorOutput) => {
          objectManager.update($scope.outputObject, $scope.inputObject, processorOutput);

          $scope.outputDisplayObject = $scope.outputObject;
        });
      }
      refreshOutput = debounce(refreshOutput, 200);

      $scope.outputObject = {};
      $scope.targetField = '';

      $scope.$watch('sourceField', refreshFieldData);
      $scope.$watch('targetField', refreshOutput);
      $scope.$watch('fieldData', refreshOutput);

      $scope.$watch('manager.updatePaused', (updatePaused) => {
        if (updatePaused) return;
        refreshFields();
      });

      $scope.$watchCollection('inputObject', () => {
        console.log($scope.processor.processorId, '$watchCollection(inputObject)');
        refreshFields();
      });
      $scope.$watch('inputObject', () => {
        console.log($scope.processor.processorId, '$watch(inputObject)');
        refreshFields();
      });
    }
  };
});
