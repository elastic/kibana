define(function (require) {
  return function KbnControllerTimefilter(notify, $scope, timefilter, globalState, sessionStorage) {
    var _ = require('lodash');

    $scope.notifList = notify._notifs;
    $scope.timefilter = timefilter;

    $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
      globalState.time = _.clone(timefilter.time);
      globalState.save();
    });

    $scope.timefilter.refreshInterval = sessionStorage.get('refreshInterval');
    $scope.$watch('timefilter.refreshInterval', function (refreshInterval) {
      if (refreshInterval != null && _.isNumber(refreshInterval.value)) {
        sessionStorage.set('refreshInterval', refreshInterval);
      } else {
        $scope.timefilter.refreshInterval = { value : 0, display : 'Off' };
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

    function slideTime(op) {
      op = op || 'subtract';
      var bounds = timefilter.getBounds();
      var interval = bounds.max.diff(bounds.min);
      var from = bounds.min.clone()[op](interval, 'ms');
      var to = bounds.max.clone()[op](interval, 'ms');
      timefilter.time.from = from;
      timefilter.time.to = to;
      timefilter.time.mode = 'absolute';
    }

    $scope.previousTimeperiod = _.partial(slideTime, 'subtract');
    $scope.nextTimeperiod = _.partial(slideTime, 'add');
  };
});
