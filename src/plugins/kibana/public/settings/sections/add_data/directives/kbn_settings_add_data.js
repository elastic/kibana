const app = require('ui/modules').get('kibana');
const _ = require('lodash');

//require('./object_changes.js');

app.directive('kbnSettingsAddData', function () {
  return {
    restrict: 'E',
    controller: function ($scope, AppState) {
      /*
      let test = new AppState();
      console.log(test);

      var $state = $scope.state = new AppState();
      console.log('AppState after new AppState', $state);

      $scope.steps = require('../steps');

      $scope.changeStep = function(step) {
        console.log('changeStep', step);
        $scope.currentStep = step;
        $state.currentStep = step.title;
        $state.save();
      }

      $scope.$watch('state.currentStep', function (currentStep) {
        console.log('WATCHER FIRED state.currentStep', currentStep);
        if (!currentStep) {
          $scope.changeStep($scope.steps[0]);
        }
      });

      if ($state.currentStep) {
        console.log('Yep, theres a current step in the state.', $state);
        $scope.currentStep = _.find($scope.steps, {title: $state.currentStep});
      }

      $scope.test = 'I am being bound correctly.';
      */
    }
  };
});
