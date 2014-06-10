define(function (require) {
  var module = require('modules').get('kibana/directives');
  var _ = require('lodash');
  var datemath = require('utils/datemath');
  var moment = require('moment');

  require('components/timepicker/quick_ranges');

  module.directive('prettyDuration', function (config, quickRanges) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '='
      },
      link: function ($scope, $elem) {
        var dateFormat = config.get('dateFormat');

        var lookupByRange = {};
        _.each(quickRanges, function (frame) {
          lookupByRange[frame.from + ' to ' + frame.to] = frame;
        });

        var stringify = function () {
          // If both parts are date math, try to look up a reasonable string
          if (!moment.isMoment($scope.from) && !moment.isMoment($scope.to)) {
            var tryLookup = lookupByRange[$scope.from.toString() + ' to ' + $scope.to.toString()];
            if (tryLookup) {
              $elem.text(tryLookup.display);
            } else {
              cantLookup();
            }
          // If at least one part is a moment, try to make pretty strings by parsing date math
          } else {
            cantLookup();
          }
        };

        var cantLookup = function () {
          var display = {};
          _.each(['from', 'to'], function (time) {
            if (moment.isMoment($scope[time])) {
              display[time] = $scope[time].format(dateFormat);
            } else {
              if ($scope[time] === 'now') {
                display[time] = 'now';
              } else {
                var tryParse = datemath.parse($scope[time], time === 'to' ? true : false);
                display[time] = moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : $scope[time];
              }
            }
          });
          $elem.text(display.from + ' to ' + display.to);
        };

        $scope.$watch('from', stringify);
        $scope.$watch('to', stringify);

      }
    };
  });

});