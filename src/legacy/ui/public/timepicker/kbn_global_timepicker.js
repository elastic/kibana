/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { uiModules } from '../modules';

import toggleHtml from './kbn_global_timepicker.html';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';

uiModules
  .get('kibana')
  .directive('kbnGlobalTimepicker', (globalState, config) => {
    const listenForUpdates = ($scope) => {
      $scope.$listenAndDigestAsync(timefilter, 'refreshIntervalUpdate', () => {
        setTimefilterValues($scope);
      });
      $scope.$listenAndDigestAsync(timefilter, 'timeUpdate', () => {
        setTimefilterValues($scope);
      });
      $scope.$listenAndDigestAsync(timefilter, 'enabledUpdated', () => {
        setTimefilterValues($scope);
      });
    };

    function setTimefilterValues($scope) {
      const time = timefilter.getTime();
      const refreshInterval = timefilter.getRefreshInterval();
      $scope.timefilterValues = {
        refreshInterval: refreshInterval,
        time: time,
        isAutoRefreshSelectorEnabled: timefilter.isAutoRefreshSelectorEnabled,
        isTimeRangeSelectorEnabled: timefilter.isTimeRangeSelectorEnabled,
      };
      $scope.recentlyUsedRanges = timeHistory.get().map(({ from, to }) => {
        return {
          start: from,
          end: to,
        };
      });
    }

    return {
      template: toggleHtml,
      replace: true,
      link: ($scope) => {
        listenForUpdates($scope);

        setTimefilterValues($scope);

        config.watch('timepicker:quickRanges', (quickRanges) => {
          // quickRanges is null when timepicker:quickRanges is set to default value
          const ranges = quickRanges ? quickRanges : config.get('timepicker:quickRanges');
          $scope.commonlyUsedRanges = ranges.map(({ from, to, display }) => {
            return {
              start: from,
              end: to,
              label: display,
            };
          });
        });

        config.watch('dateFormat', (dateFormat) => {
          // dateFormat is null when dateFormat is set to default value
          $scope.dateFormat = dateFormat ? dateFormat : config.get('dateFormat');
        });

        $scope.updateFilter = function ({ start, end }) {
          timefilter.setTime({ from: start, to: end });
        };

        $scope.updateInterval = function ({ isPaused, refreshInterval }) {
          timefilter.setRefreshInterval({
            pause: isPaused,
            value: refreshInterval ? refreshInterval : $scope.timefilterValues.refreshInterval.value
          });
        };

        $scope.getSharedTimeFilterFromDate = function () {
          return (timefilter.isAutoRefreshSelectorEnabled || timefilter.isTimeRangeSelectorEnabled)
            ? timefilter.getBounds().min.clone().utc().format()
            : null;
        };

        $scope.getSharedTimeFilterToDate = function () {
          return (timefilter.isAutoRefreshSelectorEnabled || timefilter.isTimeRangeSelectorEnabled)
            ? timefilter.getBounds().max.clone().utc().format()
            : null;
        };
      },
    };
  });
