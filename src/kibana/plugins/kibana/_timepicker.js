define(function (require) {
  return function KbnControllerTimefilter(notify, $scope, timefilter, globalState) {
    var _ = require('lodash');

    $scope.notifList = notify._notifs;
    $scope.timefilter = timefilter;

    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.save();
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