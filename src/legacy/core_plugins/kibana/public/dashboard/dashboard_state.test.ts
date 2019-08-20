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

import './np_core.test.mocks';

import { DashboardStateManager } from './dashboard_state_manager';
import { getAppStateMock, getSavedDashboardMock } from './__tests__';
import { AppStateClass } from 'ui/state_management/app_state';
import { DashboardAppState } from './types';
import { Timefilter } from 'ui/timefilter';
import { ViewMode } from '../../../embeddable_api/public/np_ready/public';

describe('DashboardState', function() {
  let dashboardState: DashboardStateManager;
  const savedDashboard = getSavedDashboardMock();
  const mockTimefilter: Timefilter = {
    time: { to: 'now', from: 'now-15m' },
    setTime(time) {
      this.time = time;
    },
    getTime() {
      return this.time;
    },
    disableAutoRefreshSelector: jest.fn(),
    setRefreshInterval: jest.fn(),
    getRefreshInterval: jest.fn(),
    disableTimeRangeSelector: jest.fn(),
    enableAutoRefreshSelector: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
    getActiveBounds: () => {},
    enableTimeRangeSelector: () => {},
    isAutoRefreshSelectorEnabled: true,
    isTimeRangeSelectorEnabled: true,
  };

  function initDashboardState() {
    dashboardState = new DashboardStateManager({
      savedDashboard,
      AppStateClass: getAppStateMock() as AppStateClass<DashboardAppState>,
      hideWriteControls: false,
    });
  }

  describe('syncTimefilterWithDashboard', function() {
    test('syncs quick time', function() {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      mockTimefilter.time.from = '2015-09-19 06:31:44.000';
      mockTimefilter.time.to = '2015-09-29 06:31:44.000';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter);

      expect(mockTimefilter.time.to).toBe('now/w');
      expect(mockTimefilter.time.from).toBe('now/w');
    });

    test('syncs relative time', function() {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now-13d';
      savedDashboard.timeTo = 'now';

      mockTimefilter.time.from = '2015-09-19 06:31:44.000';
      mockTimefilter.time.to = '2015-09-29 06:31:44.000';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter);

      expect(mockTimefilter.time.to).toBe('now');
      expect(mockTimefilter.time.from).toBe('now-13d');
    });

    test('syncs absolute time', function() {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
      savedDashboard.timeTo = '2015-09-29 06:31:44.000';

      mockTimefilter.time.from = 'now/w';
      mockTimefilter.time.to = 'now/w';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter);

      expect(mockTimefilter.time.to).toBe(savedDashboard.timeTo);
      expect(mockTimefilter.time.from).toBe(savedDashboard.timeFrom);
    });
  });

  describe('isDirty', function() {
    beforeAll(() => {
      initDashboardState();
    });

    test('getIsDirty is true if isDirty is true and editing', () => {
      dashboardState.switchViewMode(ViewMode.EDIT);
      dashboardState.isDirty = true;
      expect(dashboardState.getIsDirty()).toBeTruthy();
    });

    test('getIsDirty is false if isDirty is true and editing', () => {
      dashboardState.switchViewMode(ViewMode.VIEW);
      dashboardState.isDirty = true;
      expect(dashboardState.getIsDirty()).toBeFalsy();
    });
  });
});
