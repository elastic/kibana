/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import $ from 'jquery';
import template from './timelion_interval.html';

export function TimelionInterval($timeout) {
  return {
    restrict: 'E',
    scope: {
      // The interval model
      model: '=',
      changeInterval: '=',
    },
    template,
    link: function ($scope, $elem) {
      $scope.intervalOptions = ['auto', '1s', '1m', '1h', '1d', '1w', '1M', '1y', 'other'];
      $scope.intervalLabels = {
        auto: 'auto',
        '1s': '1 second',
        '1m': '1 minute',
        '1h': '1 hour',
        '1d': '1 day',
        '1w': '1 week',
        '1M': '1 month',
        '1y': '1 year',
        other: 'other',
      };

      $scope.$watch('model', function (newVal, oldVal) {
        // Only run this on initialization
        if (newVal !== oldVal || oldVal == null) return;

        if (_.includes($scope.intervalOptions, newVal)) {
          $scope.interval = newVal;
        } else {
          $scope.interval = 'other';
        }

        if (newVal !== 'other') {
          $scope.otherInterval = newVal;
        }
      });

      $scope.$watch('interval', function (newVal, oldVal) {
        if (newVal === oldVal || $scope.model === newVal) return;

        if (newVal === 'other') {
          $scope.otherInterval = oldVal;
          $scope.changeInterval($scope.otherInterval);
          $timeout(function () {
            $('input', $elem).select();
          }, 0);
        } else {
          $scope.otherInterval = $scope.interval;
          $scope.changeInterval($scope.interval);
        }
      });

      $scope.$watch('otherInterval', function (newVal, oldVal) {
        if (newVal === oldVal || $scope.model === newVal) return;
        $scope.changeInterval(newVal);
      });
    },
  };
}
