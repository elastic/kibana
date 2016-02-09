import _ from 'lodash';
import ConfigTemplate from 'ui/ConfigTemplate';
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
      $scope.pickerTemplate = new ConfigTemplate({
        filter: require('ui/chrome/config/filter.html'),
        interval: require('ui/chrome/config/interval.html')
      });

      $scope.toggleRefresh = function () {
        timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
      };
    }
  };
});

