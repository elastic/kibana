import uiModules from 'ui/modules';
import angular from 'angular';
import '../styles/_source_data.less';
import sourceDataTemplate from '../views/source_data.html';

const app = uiModules.get('kibana');

app.directive('sourceData', function () {
  return {
    restrict: 'E',
    scope: {
      samples: '=',
      sample: '=',
      disabled: '='
    },
    template: sourceDataTemplate,
    controller: function ($scope) {
      const samples = $scope.samples;

      if (samples.length > 0) {
        $scope.selectedSample = samples[0];
      }

      $scope.$watch('selectedSample', (newValue) => {
        //the added complexity of this directive is to strip out the properties
        //that angular adds to array objects that are bound via ng-options
        $scope.sample = angular.copy(newValue);
      });

      $scope.previousLine = function () {
        let currentIndex = samples.indexOf($scope.selectedSample);
        if (currentIndex <= 0) currentIndex = samples.length;

        $scope.selectedSample = samples[currentIndex - 1];
      };

      $scope.nextLine = function () {
        let currentIndex = samples.indexOf($scope.selectedSample);
        if (currentIndex >= samples.length - 1) currentIndex = -1;

        $scope.selectedSample = samples[currentIndex + 1];
      };
    }
  };
});
