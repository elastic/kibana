import _ from 'lodash';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
// TODO: all of this really belongs in the timepicker
.directive('chromeContext', function (timefilter, globalState) {

  var listenForUpdates = _.once(function ($scope) {
    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.refreshInterval = _.clone(timefilter.refreshInterval);
      globalState.save();
    });
  });

  return {
    link: function ($scope) {
      listenForUpdates($scope);

      // chrome is responsible for timepicker ui and state transfer...
      $scope.timefilter = timefilter;
      $scope.toggleRefresh = function () {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };
    }
  };
});

