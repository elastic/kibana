const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('processorRegex', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_regex.html'),
    controller: function ($scope, debounce, Promise, $timeout) {

      //this occurs when the parent processor changes it's output object,
      //which means that this processor's input object is changing.
      function refreshFields() {
        objectManager.mutateClone($scope.outputObject, $scope.inputObject);
        $scope.fields = keysDeep($scope.inputObject);

        if (!_.contains($scope.fields, $scope.sourceField)) {
          $scope.sourceField = $scope.fields[0];
        }
        refreshFieldData();
      }

      function refreshFieldData() {
        $scope.fieldData = _.get($scope.inputObject, $scope.sourceField);
        //refreshOutput();
      }
      refreshFieldData = debounce(refreshFieldData, 100);

      function getProcessorOutput() {
        return new Promise(function(resolve, reject) {
          const processorOutput = {};

          if (!$scope.expression || !$scope.targetField)
            resolve();

          $timeout(function() {
            let matches = [];
            try {
              const regex = new RegExp($scope.expression, 'ig');
              matches = $scope.fieldData.match(regex);
            } catch(err) {
            }

            if (matches) {
              if (matches.length === 1) {
                _.set(processorOutput, $scope.targetField, matches[0]);
              } else {
                _.set(processorOutput, $scope.targetField, matches);
              }
            } else {
              _.set(processorOutput, $scope.targetField, '');
            }

            resolve(processorOutput);
          }, 0);
        });
      }

      function getDescription() {
        return `RegEx [${$scope.sourceField}] -> [${$scope.targetField}]`;
      }

      function refreshOutput() {
        $scope.processorDescription = getDescription();

        getProcessorOutput()
        .then((processorOutput) => {
          objectManager.update($scope.outputObject, $scope.inputObject, processorOutput);

          if ($scope.onlyShowNewFields) {
            $scope.outputDisplayObject = processorOutput;
          } else {
            $scope.outputDisplayObject = $scope.outputObject;
          }
        });
      }
      refreshOutput = debounce(refreshOutput, 200);

      //TODO: This is only here for debugging purposes.
      $scope.expression = '^[0-3]?[0-9]/[0-3]?[0-9]/(?:[0-9]{2})?[0-9]{2}';

      $scope.outputObject = {};
      $scope.targetField = '';

      $scope.$watch('sourceField', refreshFieldData);
      $scope.$watch('targetField', refreshOutput);
      $scope.$watch('fieldData', refreshOutput);
      $scope.$watch('expression', refreshOutput);
      $scope.$watch('onlyShowNewFields', refreshOutput);

      $scope.$watchCollection('inputObject', refreshFields);
      $scope.$watch('inputObject', function() {
        console.log('This should ONLY fire on a rewiring');
        refreshFields();
      });
    }
  };
});
