const app = require('ui/modules').get('kibana');
const _ = require('lodash');
const $ = require('jquery');
const keysDeep = require('../lib/keys_deep.js');

app.directive('processorGrok', function () {
  return {
    restrict: 'E',
    template: require('../views/processor_grok.html'),
    controller: function ($scope, $http) {
      $scope.pattern = '';

      $scope.$watch('inputObject', refreshFields);
      $scope.$watch('field', refreshFieldData);
      $scope.$watch('fieldData', refreshOutput);
      $scope.$watch('pattern', refreshOutput);

      function refreshFields() {
        $scope.fields = keysDeep($scope.inputObject);
        $scope.field = $scope.fields[0];
      }

      function refreshFieldData(field) {
        $scope.fieldData = _.get($scope.inputObject, field);
      }

      let evilCounter = 0;
      function refreshOutput() {
        const processorOutput = {
          '@timestamp': '11/24/2015',
          'message': 'src=1.1.1.1 evil=1',
          'counter': evilCounter
        };

        $scope.outputObject = _.defaultsDeep(processorOutput, $scope.inputObject);
      }
    }
  };
});
