define(function (require) {
  var module = require('modules').get('kibana/directives');
  var _ = require('lodash');
  var datemath = require('utils/datemath');
  var moment = require('moment');

  module.directive('prettyDuration', function (config) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '='
      },
      link: function ($scope, $elem) {
        var dateFormat = config.get('dateFormat');

        var stringify = function () {
          // If both parts are date math, try to look up a reasonable string
          if (!moment.isMoment($scope.from) && !moment.isMoment($scope.to)) {
            var tryLookup = lookup[$scope.from.toString() + ' to ' + $scope.to.toString()];
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

        // TODO: Move this to a service so we can share it with the directive?
        var lookup = {
          'now/d to now/d':       { display: 'Today', section: 0 },
          'now/w to now/w':       { display: 'This week', section: 0 },
          'now/M to now/M':       { display: 'This month', section: 0 },
          'now/y to now/y':       { display: 'This year', section: 0 },
          'now/d to now':         { display: 'The day so far', section: 0 },
          'now/w to now':         { display: 'Week to date', section: 0 },
          'now/M to now':         { display: 'Month to date', section: 0 },
          'now/y to now':         { display: 'Year to date', section: 0 },

          'now-1d/d to now-1d/d': { display: 'Yesterday', section: 1 },
          'now-2d/d to now-2d/d': { display: 'Day before yesterday', section: 1 },
          'now-7d/d to now-7d/d': { display: 'This day last week', section: 1 },
          'now-1w/w to now-1w/w': { display: 'Last week', section: 1 },
          'now-1M/M to now-1M/M': { display: 'Last month', section: 1 },
          'now-1y/y to now-1y/y': { display: 'Last year', section: 1 },

          'now-15m to now':       { display: 'Last 15 minutes', section: 2 },
          'now-30m to now':       { display: 'Last 30 minutes', section: 2 },
          'now-1h to now':        { display: 'Last 1 hour', section: 2 },
          'now-4h to now':        { display: 'Last 4 hours', section: 2 },
          'now-12h to now':       { display: 'Last 12 hours', section: 2 },
          'now-24h to now':       { display: 'Last 24 hours', section: 2 },
          'now-7d to now':        { display: 'Last 7 days', section: 2 },
          'now-30d to now':       { display: 'Last 30 days', section: 2 },
        };

        $scope.$watch('from', stringify);
        $scope.$watch('to', stringify);

      }
    };
  });

});