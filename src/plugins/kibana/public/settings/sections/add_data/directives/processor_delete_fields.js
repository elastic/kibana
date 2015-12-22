const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep');
const objectManager = require('../lib/object_manager');
require('./processor_header');

app.directive('processorDeleteFields', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_delete_fields.html'),
    controller: function ($scope, debounce, Promise, $timeout) {

      //this occurs when the parent processor changes it's output object,
      //which means that this processor's input object is changing.
      function refreshFields() {
        objectManager.mutateClone($scope.outputObject, $scope.inputObject);

        let fields = [];
        keysDeep($scope.inputObject).forEach((fieldname) => {
          fields.push({ name: fieldname, selected: false });
        });
        $scope.fields = fields;
      }

      function getProcessorOutput() {
        return new Promise(function(resolve, reject) {
          let fieldsToRemove = [];
          $scope.fields.forEach((field) => {
            if (field.selected) {
              fieldsToRemove.push(field.name);
            }
          });
          resolve(fieldsToRemove);
        });
      }

      function refreshOutput() {
        getProcessorOutput()
        .then((processorOutput) => {
          objectManager.update($scope.outputObject, $scope.inputObject, null, processorOutput);

          if ($scope.onlyShowNewFields) {
            $scope.outputDisplayObject = processorOutput;
          } else {
            $scope.outputDisplayObject = $scope.outputObject;
          }
        });
      }
      refreshOutput = debounce(refreshOutput, 200);

      $scope.outputObject = {};

      $scope.toggleField = function(field) {
        refreshOutput();
      }

      $scope.$watchCollection('fields', refreshOutput);

      $scope.$watchCollection('inputObject', refreshFields);
    }
  };
});
