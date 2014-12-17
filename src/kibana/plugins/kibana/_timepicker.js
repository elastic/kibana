define(function (require) {
  return function KbnControllerTimefilter(notify, $scope, timefilter, globalState, sessionStorage) {
    var _ = require('lodash');

    $scope.notifList = notify._notifs;
    $scope.timefilter = timefilter;

    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.save();
    });

    if (_.isUndefined(sessionStorage.get('refreshInterval'))) {
      $scope.timefilter.refreshInterval = { value : 0, display : 'Off' };
    } else {
      $scope.timefilter.refreshInterval = sessionStorage.get('refreshInterval');
    }

    $scope.$watch('timefilter.refreshInterval', function () {
      var refreshInterval = $scope.timefilter.refreshInterval;
      if (!_.isUndefined(refreshInterval) && _.isNumber(refreshInterval.value)) {
        sessionStorage.set('refreshInterval', refreshInterval);
      }
    });

    var timepickerHtml = require('text!plugins/kibana/_timepicker.html');
    $scope.toggleTimepicker = function () {
      // Close if already open
      if ($scope.globalConfigTemplate === timepickerHtml) {
        delete $scope.globalConfigTemplate;
      } else {
        $scope.globalConfigTemplate = timepickerHtml;
      }
    };

  };
});