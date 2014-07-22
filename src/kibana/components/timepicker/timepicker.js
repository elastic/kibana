define(function (require) {
  var html = require('text!components/timepicker/timepicker.html');
  var module = require('modules').get('components/timepicker');
  var _ = require('lodash');
  var datemath = require('utils/datemath');
  var moment = require('moment');

  require('directives/input_datetime');
  require('components/timepicker/quick_ranges');


  module.directive('kbnTimepicker', function (quickRanges) {
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
          $scope.formatRelative();
        };

        $scope.format = 'MMMM Do YYYY, HH:mm:ss.SSS';
        $scope.modes = ['quick', 'relative', 'absolute'];
        if (_.isUndefined($scope.mode)) $scope.mode = 'quick';

        $scope.quickLists = _.map(_.uniq(_.pluck(quickRanges, 'section')), function (section) {
          return _.filter(quickRanges, {section: section});
        });


        $scope.relative = {
          count: 1,
          unit: 'm',
          preview: undefined,
          round: false
        };

        $scope.absolute = {
          from: moment(),
          to: moment()
        };

        $scope.units = {
          s: 'second',
          m: 'minute',
          h: 'hour',
          d: 'day',
          w: 'week',
          M: 'month',
          y: 'year'
        };

        $scope.relativeOptions = [
          {text: 'Seconds ago', value: 's'},
          {text: 'Minutes ago', value: 'm'},
          {text: 'Hours ago', value: 'h'},
          {text: 'Days ago', value: 'd'},
          {text: 'Weeks ago', value: 'w'},
          {text: 'Months ago', value: 'M'},
          {text: 'Years ago', value: 'y'},
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
            var duration = moment.duration(moment().diff(datemath.parse($scope.from)));
            var units = _.pluck(_.clone($scope.relativeOptions).reverse(), 'value');
            for (var i = 0; i < units.length; i++) {
              var as = duration.as(units[i]);
              if (as > 1) {
                $scope.relative.count = Math.round(as);
                $scope.relative.unit = units[i];
                break;
              }
            }
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
          var parsed = datemath.parse(getRelativeString());
          $scope.relative.preview =  parsed ? parsed.format($scope.format) : undefined;
          return parsed;
        };

        $scope.applyRelative = function () {
          $scope.from = getRelativeString();
          $scope.to = 'now';
        };

        var getRelativeString = function () {
          return 'now-' + $scope.relative.count + $scope.relative.unit + ($scope.relative.round ? '/' + $scope.relative.unit : '');
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