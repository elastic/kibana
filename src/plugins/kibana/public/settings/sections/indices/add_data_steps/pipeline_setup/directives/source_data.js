const app = require('ui/modules').get('kibana');
const _ = require('lodash');
require('../styles/_source_data.less');

app.directive('sourceData', function () {
  return {
    restrict: 'E',
    scope: {
      sampleDocs: '=',
      outputObject: '='
    },
    template: require('../views/source_data.html'),
    controller: function ($scope) {
      const sampleDocs = $scope.sampleDocs;

      $scope.previousLine = function () {
        let currentIndex = sampleDocs.indexOf($scope.outputObject);
        if (currentIndex <= 0) return;

        $scope.outputObject = sampleDocs[currentIndex - 1];
      };

      $scope.nextLine = function () {
        let currentIndex = sampleDocs.indexOf($scope.outputObject);
        if (currentIndex >= sampleDocs.length - 1) return;

        $scope.outputObject = sampleDocs[currentIndex + 1];
      };
    }
  };
});
