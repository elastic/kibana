import _ from 'lodash';
import $ from 'jquery';

const app = require('ui/modules').get('apps/timelion', []);
import template from './timelion_interval.html';
import './timelion_interval.less';

app.directive('timelionInterval', function ($compile, $timeout) {
  return {
    restrict: 'E',
    scope: {
      // The interval model
      model: '=',
    },
    template,
    link: function ($scope, $elem) {
      $scope.intervalOptions = ['auto', '1s', '1m', '1h', '1d', '1w', '1M', '1y', 'other'];
      $scope.intervalLabels = {
        'auto': 'auto',
        '1s': '1 second',
        '1m': '1 minute',
        '1h': '1 hour',
        '1d': '1 day',
        '1w': '1 week',
        '1M': '1 month',
        '1y': '1 year',
        'other': 'other'
      };

      $scope.$watch('model', function (newVal, oldVal) {
        // Only run this on initialization
        if (newVal !== oldVal || oldVal == null) return;

        if (_.contains($scope.intervalOptions, newVal)) {
          $scope.interval = newVal;
        } else {
          $scope.interval = 'other';
        }

        if (newVal !== 'other') {
          $scope.otherInterval = newVal;
        }
      });

      $scope.$watch('interval', function (newVal, oldVal) {
        if (newVal === oldVal) return;

        if (newVal === 'other') {
          $scope.otherInterval = oldVal;
          $scope.model = $scope.otherInterval;
          $timeout(function () {
            $('input', $elem).select();
          }, 0);
        } else {
          $scope.otherInterval = $scope.interval;
          $scope.model = $scope.interval;
        }
      });

      $scope.$watch('otherInterval', function (newVal, oldVal) {
        if (newVal === oldVal) return;
        $scope.model = newVal;
      });
    }
  };
});
