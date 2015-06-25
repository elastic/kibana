define(function (require) {
  return function KbnControllerTimefilter(notify, $scope, timefilter, globalState, sessionStorage) {
    var _ = require('lodash');

    $scope.notifList = notify._notifs;
    $scope.timefilter = timefilter;

    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.refreshInterval = _.clone(timefilter.refreshInterval);
      globalState.save();
    });

    var timepickerHtml = require('text!plugins/kibana/_timepicker.html');
    $scope.toggleTimepicker = function (tab) {
      tab = tab || timefilter.timepickerActiveTab || 'filter';

      // Close if already open
      if ($scope.globalConfigTemplate === timepickerHtml && timefilter.timepickerActiveTab === tab) {
        delete $scope.globalConfigTemplate;
        delete timefilter.timepickerActiveTab;
      } else {
        timefilter.timepickerActiveTab = tab;
        $scope.globalConfigTemplate = timepickerHtml;
      }
    };

    $scope.toggleRefresh = function () {
      timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
    };
  };
});
