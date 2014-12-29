define(function (require) {
  var html = require('text!components/timepicker/timepicker.html');
  var module = require('modules').get('components/timepicker');
  var _ = require('lodash');
  var datemath = require('utils/datemath');
  var moment = require('moment');

  require('directives/input_datetime');
  require('components/timepicker/quick_ranges');
  require('components/timepicker/time_units');


  module.directive('kbnTimepicker', function (quickRanges, timeUnits) {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '=',
        mode: '='
      },
      template: html,
      controller: function ($scope) {
        var init = function () {
          $scope.setMode($scope.mode);
          $scope.formatRelative();
        };

        $scope.format = 'MMMM Do YYYY, HH:mm:ss.SSS';
        $scope.modes = ['quick', 'relative', 'absolute'];
        if (_.isUndefined($scope.mode)) $scope.mode = 'quick';

        $scope.quickLists = _.map(_.uniq(_.pluck(quickRanges, 'section')), function (section) {
          return _.filter(quickRanges, {section: section});
        });

        $scope.relative = {
          'from' : {
            count: 1,
            unit: 'm',
            preview: undefined,
            round: false,
            date: undefined
          },
          'to' : {
            count: 0,
            unit: 'm',
            preview: undefined,
            round: false,
            date: undefined
          }
        };

        $scope.absolute = {
          from: moment(),
          to: moment()
        };

        $scope.units = timeUnits;

        $scope.relativeOptions = [
          {text: 'Seconds ago', value: 's'},
          {text: 'Minutes ago', value: 'm'},
          {text: 'Hours ago', value: 'h'},
          {text: 'Days ago', value: 'd'},
          {text: 'Weeks ago', value: 'w'},
          {text: 'Months ago', value: 'M'},
          {text: 'Years ago', value: 'y'}
        ];

        $scope.$watch('absolute.from', function (date) {
          if (_.isDate(date)) $scope.absolute.from = moment(date);
        });

        $scope.$watch('absolute.to', function (date) {
          if (_.isDate(date)) $scope.absolute.to = moment(date);
        });

        $scope.setMode = function (thisMode) {
          switch (thisMode) {
          case 'quick':
            break;
          case 'relative':
            var parts = {
              'from': $scope.from.toString().split('-'),
              'to': $scope.to.toString().split('-')
            };
            var relativeParts = {
              'from' : [],
              'to' : []
            };

            // Try to parse the relative time, if we can't use moment duration to guestimate
            if (parts.from[0] === 'now' && parts.from[1] && parts.to[0] === 'now' && parts.to[1]) {
              relativeParts.from = parts.from[1].match(/([0-9]+)([smhdwMy]).*/);
              relativeParts.to = parts.to[1].match(/([0-9]+)([smhdwMy]).*/);
            }
            if (relativeParts.from[1] && relativeParts.from[2] && relativeParts.to[1] && relativeParts.to[2]) {
              $scope.relative.from.count = parseInt(relativeParts.from[1], 10);
              $scope.relative.to.count = parseInt(relativeParts.to[1], 10);
              $scope.relative.from.unit = relativeParts.from[2];
              $scope.relative.to.unit = relativeParts.to[2];
            } else {
              var duration = {
                'from': moment.duration(moment().diff(datemath.parse($scope.from))),
                'to': moment.duration(moment().diff(datemath.parse($scope.to)))
              };
              var units = _.pluck(_.clone($scope.relativeOptions).reverse(), 'value');
              if ($scope.from.toString().split('/')[1]) $scope.relative.from.round = true;
              if ($scope.to.toString().split('/')[1]) $scope.relative.to.round = true;
              for (var i = 0; i < units.length; i++) {
                var ok = {
                  'from' : false,
                  'to' : false
                };
                var as = {
                  'form' : duration.from.as(units[i]),
                  'to' : duration.to.as(units[i])
                };
                if (as.from > 1 && !ok.from) {
                  $scope.relative.from.count = Math.round(as.from);
                  $scope.relative.from.unit = units[i];
                  ok.from = true;
                }
                if (as.to > 1 && !ok.to) {
                  $scope.relative.to.count = Math.round(as.to);
                  $scope.relative.to.unit = units[i];
                  ok.from = true;
                }
                if (ok.from && ok.to) {
                  break;
                }
              }
            }

            if ($scope.from.toString().split('/')[1]) $scope.relative.from.round = true;
            if ($scope.to.toString().split('/')[1]) $scope.relative.to.round = true;

            break;
          case 'absolute':
            $scope.absolute.from = datemath.parse($scope.from || moment().subtract('minutes', 15));
            $scope.absolute.to = datemath.parse($scope.to || moment(), true);
            break;
          }

          $scope.mode = thisMode;
        };

        $scope.setQuick = function (from, to, description) {
          $scope.from = from;
          $scope.to = to;
        };

        $scope.formatRelative = function () {
          var parsed = {
            'from' : datemath.parse(getRelativeString().from),
            'to' : datemath.parse(getRelativeString().to)
          };
          if (parsed.from) {
            $scope.relative.from.preview =  parsed.from.format($scope.format);
            $scope.relative.from.date = parsed.from;
          } else {
            $scope.relative.from.preview = undefined;
            $scope.relative.from.date = undefined;
          }
          if (parsed.to) {
            $scope.relative.to.preview =  parsed.to.format($scope.format);
            $scope.relative.to.date = parsed.to;
          } else {
            $scope.relative.to.preview = undefined;
            $scope.relative.to.date = undefined;
          }
          return parsed;
        };

        $scope.applyRelative = function () {
          $scope.from = getRelativeString().from;
          $scope.to = getRelativeString().to;
        };

        var getRelativeString = function () {
          return {
            'from' : 'now-' + $scope.relative.from.count + $scope.relative.from.unit +
              ($scope.relative.from.round ? '/' + $scope.relative.from.unit : ''),
            'to' : 'now-' + $scope.relative.to.count + $scope.relative.to.unit +
              ($scope.relative.to.round ? '/' + $scope.relative.to.unit : '')
          };
        };

        $scope.applyAbsolute = function () {
          $scope.from = moment($scope.absolute.from);
          $scope.to = moment($scope.absolute.to);
        };

        init();
      }
    };
  });

});
