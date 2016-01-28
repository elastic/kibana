const app = require('ui/modules').get('kibana');
const _ = require('lodash');
require('../styles/_source_data.less');

app.directive('sourceDataNew', function () {
  return {
    restrict: 'E',
    scope: {
      outputObject: '='
    },
    template: require('../views/source_data.html'),
    controller: function ($scope, debounce) {
      function refreshFieldData() {
        $scope.fieldData = _.get($scope.inputObject, $scope.sourceField);
        refreshOutput();
      }
      refreshFieldData = debounce(refreshFieldData, 100);

      function getProcessorOutput() {
        const newObj = {
          _raw: $scope.selectedLine
        };

        return newObj;
      }

      function refreshOutput() {
        const newOutput = getProcessorOutput();

        if (newOutput) {
          $scope.outputObject = getProcessorOutput();
        }
      }
      refreshOutput = debounce(refreshOutput, 200);

      const data = require('../sample_data.txt');
      $scope.documentLines = data.split('\n');
      $scope.$watch('selectedLine', refreshOutput);

      $scope.previousLine = function() {
        let currentIndex = $scope.documentLines.indexOf($scope.selectedLine);
        if (currentIndex <= 0) return;

        $scope.selectedLine = $scope.documentLines[currentIndex-1];
      }

      $scope.nextLine = function() {
        let currentIndex = $scope.documentLines.indexOf($scope.selectedLine);
        if (currentIndex >= $scope.documentLines.length - 1) return;

        $scope.selectedLine = $scope.documentLines[currentIndex+1];
      }
    }
  };
});
