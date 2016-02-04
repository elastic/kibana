const app = require('ui/modules').get('kibana');
const _ = require('lodash');
require('../styles/_source_data.less');

app.directive('sourceData', function () {
  return {
    restrict: 'E',
    scope: {
      samples: '=',
      sample: '='
    },
    template: require('../views/source_data.html'),
    controller: function ($scope) {
      const samples = $scope.samples;

      if (samples.length > 0) {
        $scope.sample = samples[0];
      }

      $scope.previousLine = function () {
        let currentIndex = samples.indexOf($scope.sample);
        if (currentIndex <= 0) return;

        $scope.sample = samples[currentIndex - 1];
      };

      $scope.nextLine = function () {
        let currentIndex = samples.indexOf($scope.sample);
        if (currentIndex >= samples.length - 1) return;

        $scope.sample = samples[currentIndex + 1];
      };
    }
  };
});
