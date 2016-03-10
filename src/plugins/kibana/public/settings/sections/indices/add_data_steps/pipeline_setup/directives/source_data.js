import uiModules from 'ui/modules';
import angular from 'angular';

require('../styles/_source_data.less');

const app = uiModules.get('kibana');

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
        $scope.selectedSample = samples[0];
      }

      $scope.$watch('selectedSample', (newValue) => {
        $scope.sample = angular.copy(newValue);
      });

      $scope.previousLine = function () {
        let currentIndex = samples.indexOf($scope.selectedSample);
        if (currentIndex <= 0) return;

        $scope.selectedSample = samples[currentIndex - 1];
      };

      $scope.nextLine = function () {
        let currentIndex = samples.indexOf($scope.selectedSample);
        if (currentIndex >= samples.length - 1) return;

        $scope.selectedSample = samples[currentIndex + 1];
      };
    }
  };
});
