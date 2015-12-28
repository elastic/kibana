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

        const newKeys = keysDeep($scope.inputObject);
        const oldKeys = $scope.fields.map((field) => field.name);
        const removed = _.difference(oldKeys, newKeys);
        const added = _.difference(newKeys, oldKeys);

        added.forEach((fieldname) => {
          $scope.fields.push({ name: fieldname, selected: false });
        });
        removed.forEach((fieldname) => {
          _.remove($scope.fields, (field) => {
            return field.name === fieldname;
          });
        });
        $scope.fields.sort();
      }

      function getSelectedFields() {
        let result = [];
        $scope.fields.forEach((field) => {
          if (field.selected) {
            result.push(field.name);
          }
        });

        return result;
      }

      function getProcessorOutput() {
        const fieldsToRemove = getSelectedFields();

        return new Promise(function(resolve, reject) {
          resolve(fieldsToRemove);
        });
      }

      function getDescription() {
        let fieldList = getSelectedFields()
          .map(field => `[${field}]`).join(', ');

        return `Delete Fields ${fieldList}`;
      }

      function refreshOutput() {
        $scope.processorDescription = getDescription();

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
      $scope.fields = [];

      $scope.toggleField = function(field) {
        refreshOutput();
      }

      $scope.$watchCollection('fields', refreshOutput);

      $scope.$watchCollection('inputObject', refreshFields);
      $scope.$watch('inputObject', function() {
        console.log('This should ONLY fire on a rewiring');
        refreshFields();
      });
    }
  };
});
