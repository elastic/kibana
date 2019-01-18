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

import { DashboardStateManager } from './dashboard_state_manager';
import { DashboardViewMode } from './dashboard_view_mode';
import { embeddableIsInitialized, setPanels } from './actions';
import { getAppStateMock, getSavedDashboardMock } from './__tests__';
import { store } from '../store';

jest.mock('ui/chrome', () => ({ getKibanaVersion: () => '6.0.0' }), { virtual: true });


describe('DashboardState', function () {
  let dashboardState;
  const savedDashboard = getSavedDashboardMock();
  const mockTimefilter = {
    time: {},
    setTime: function (time) { this.time = time; },
  };
  const mockQuickTimeRanges = [{ from: 'now/w', to: 'now/w', display: 'This week', section: 0 }];
  const mockIndexPattern = { id: 'index1' };

  function initDashboardState() {
    dashboardState = new DashboardStateManager({
      savedDashboard,
      AppState: getAppStateMock(),
      hideWriteControls: false,
    });
  }

  describe('syncTimefilterWithDashboard', function () {
    test('syncs quick time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      mockTimefilter.time.from = '2015-09-19 06:31:44.000';
      mockTimefilter.time.to = '2015-09-29 06:31:44.000';
      mockTimefilter.time.mode = 'absolute';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter, mockQuickTimeRanges);

      expect(mockTimefilter.time.mode).toBe('quick');
      expect(mockTimefilter.time.to).toBe('now/w');
      expect(mockTimefilter.time.from).toBe('now/w');
    });

    test('syncs relative time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now-13d';
      savedDashboard.timeTo = 'now';

      mockTimefilter.time.from = '2015-09-19 06:31:44.000';
      mockTimefilter.time.to = '2015-09-29 06:31:44.000';
      mockTimefilter.time.mode = 'absolute';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter, mockQuickTimeRanges);

      expect(mockTimefilter.time.mode).toBe('relative');
      expect(mockTimefilter.time.to).toBe('now');
      expect(mockTimefilter.time.from).toBe('now-13d');
    });

    test('syncs absolute time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
      savedDashboard.timeTo = '2015-09-29 06:31:44.000';

      mockTimefilter.time.from = 'now/w';
      mockTimefilter.time.to = 'now/w';
      mockTimefilter.time.mode = 'quick';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboard(mockTimefilter, mockQuickTimeRanges);

      expect(mockTimefilter.time.mode).toBe('absolute');
      expect(mockTimefilter.time.to).toBe(savedDashboard.timeTo);
      expect(mockTimefilter.time.from).toBe(savedDashboard.timeFrom);
    });
  });

  describe('isDirty', function () {
    beforeAll(() => {
      initDashboardState();
    });

    test('getIsDirty is true if isDirty is true and editing', () => {
      dashboardState.switchViewMode(DashboardViewMode.EDIT);
      dashboardState.isDirty = true;
      expect(dashboardState.getIsDirty()).toBeTruthy();
    });

    test('getIsDirty is false if isDirty is true and editing', () => {
      dashboardState.switchViewMode(DashboardViewMode.VIEW);
      dashboardState.isDirty = true;
      expect(dashboardState.getIsDirty()).toBeFalsy();
    });
  });

  describe('panelIndexPatternMapping', function () {
    beforeAll(() => {
      initDashboardState();
    });

    function simulateNewEmbeddableWithIndexPattern({ panelId, indexPattern }) {
      store.dispatch(setPanels({ [panelId]: { panelIndex: panelId } }));
      const metadata = { title: 'my embeddable title', editUrl: 'editme', indexPattern };
      store.dispatch(embeddableIsInitialized({ metadata, panelId: panelId }));
    }

    test('initially has no index patterns', () => {
      expect(dashboardState.getPanelIndexPatterns().length).toBe(0);
    });

    test('registers index pattern when an embeddable is initialized with one', async () => {
      simulateNewEmbeddableWithIndexPattern({ panelId: 'foo1', indexPattern: mockIndexPattern });
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });

    test('registers unique index patterns', async () => {
      simulateNewEmbeddableWithIndexPattern({ panelId: 'foo2', indexPattern: mockIndexPattern });
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });

    test('does not register undefined index pattern for panels with no index pattern', async () => {
      simulateNewEmbeddableWithIndexPattern({ panelId: 'foo2' });
      await new Promise(resolve => process.nextTick(resolve));
      expect(dashboardState.getPanelIndexPatterns().length).toBe(1);
    });
  });
});
