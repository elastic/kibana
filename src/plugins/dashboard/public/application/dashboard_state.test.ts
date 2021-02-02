/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createBrowserHistory } from 'history';
import { getSavedDashboardMock } from './test_helpers';
import { DashboardContainer, DashboardContainerInput, DashboardPanelState } from '.';
import { DashboardStateManager } from './dashboard_state_manager';
import { DashboardContainerServices } from './embeddable/dashboard_container';

import { EmbeddableInput, ViewMode } from '../services/embeddable';
import { createKbnUrlStateStorage } from '../services/kibana_utils';
import { InputTimeRange, TimefilterContract, TimeRange } from '../services/data';

import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';

describe('DashboardState', function () {
  let dashboardState: DashboardStateManager;
  const savedDashboard = getSavedDashboardMock();

  let mockTime: TimeRange = { to: 'now', from: 'now-15m' };
  const mockTimefilter = {
    getTime: () => {
      return mockTime;
    },
    setTime: (time: InputTimeRange) => {
      mockTime = time as TimeRange;
    },
  } as TimefilterContract;

  // TS is *very* picky with type guards / predicates. can't just use jest.fn()
  function mockHasTaggingCapabilities(obj: any): obj is any {
    return false;
  }

  function initDashboardState() {
    dashboardState = new DashboardStateManager({
      savedDashboard,
      hideWriteControls: false,
      kibanaVersion: '7.0.0',
      kbnUrlStateStorage: createKbnUrlStateStorage(),
      history: createBrowserHistory(),
      hasTaggingCapabilities: mockHasTaggingCapabilities,
    });
  }

  function initDashboardContainer(initialInput?: Partial<DashboardContainerInput>) {
    const { doStart } = embeddablePluginMock.createInstance();
    const defaultInput: DashboardContainerInput = {
      id: '123',
      viewMode: ViewMode.EDIT,
      filters: [] as DashboardContainerInput['filters'],
      query: {} as DashboardContainerInput['query'],
      timeRange: {} as DashboardContainerInput['timeRange'],
      useMargins: true,
      syncColors: false,
      title: 'ultra awesome test dashboard',
      isFullScreenMode: false,
      panels: {} as DashboardContainerInput['panels'],
    };
    const input = { ...defaultInput, ...(initialInput ?? {}) };
    return new DashboardContainer(input, { embeddable: doStart() } as DashboardContainerServices);
  }

  describe('syncTimefilterWithDashboard', function () {
    test('syncs quick time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now/w';
      savedDashboard.timeTo = 'now/w';

      mockTime.from = '2015-09-19 06:31:44.000';
      mockTime.to = '2015-09-29 06:31:44.000';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

      expect(mockTime.to).toBe('now/w');
      expect(mockTime.from).toBe('now/w');
    });

    test('syncs relative time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = 'now-13d';
      savedDashboard.timeTo = 'now';

      mockTime.from = '2015-09-19 06:31:44.000';
      mockTime.to = '2015-09-29 06:31:44.000';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

      expect(mockTime.to).toBe('now');
      expect(mockTime.from).toBe('now-13d');
    });

    test('syncs absolute time', function () {
      savedDashboard.timeRestore = true;
      savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
      savedDashboard.timeTo = '2015-09-29 06:31:44.000';

      mockTime.from = 'now/w';
      mockTime.to = 'now/w';

      initDashboardState();
      dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

      expect(mockTime.to).toBe(savedDashboard.timeTo);
      expect(mockTime.from).toBe(savedDashboard.timeFrom);
    });
  });

  describe('Dashboard Container Changes', () => {
    beforeEach(() => {
      initDashboardState();
    });

    test('expanedPanelId in container input casues state update', () => {
      dashboardState.setExpandedPanelId = jest.fn();

      const dashboardContainer = initDashboardContainer({
        expandedPanelId: 'theCoolestPanelOnThisDashboard',
        panels: {
          theCoolestPanelOnThisDashboard: {
            explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
          } as DashboardPanelState<EmbeddableInput>,
        },
      });

      dashboardState.handleDashboardContainerChanges(dashboardContainer);
      expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(
        'theCoolestPanelOnThisDashboard'
      );
    });

    test('expanedPanelId is not updated when it is the same', () => {
      dashboardState.setExpandedPanelId = jest
        .fn()
        .mockImplementation(dashboardState.setExpandedPanelId);

      const dashboardContainer = initDashboardContainer({
        expandedPanelId: 'theCoolestPanelOnThisDashboard',
        panels: {
          theCoolestPanelOnThisDashboard: {
            explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
          } as DashboardPanelState<EmbeddableInput>,
        },
      });

      dashboardState.handleDashboardContainerChanges(dashboardContainer);
      dashboardState.handleDashboardContainerChanges(dashboardContainer);
      expect(dashboardState.setExpandedPanelId).toHaveBeenCalledTimes(1);
    });

    test('expandedPanelId is set to undefined if panel does not exist in input', () => {
      dashboardState.setExpandedPanelId = jest
        .fn()
        .mockImplementation(dashboardState.setExpandedPanelId);
      const dashboardContainer = initDashboardContainer({
        expandedPanelId: 'theCoolestPanelOnThisDashboard',
        panels: {
          theCoolestPanelOnThisDashboard: {
            explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
          } as DashboardPanelState<EmbeddableInput>,
        },
      });

      dashboardState.handleDashboardContainerChanges(dashboardContainer);
      expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(
        'theCoolestPanelOnThisDashboard'
      );

      dashboardContainer.updateInput({ expandedPanelId: 'theLeastCoolPanelOnThisDashboard' });
      dashboardState.handleDashboardContainerChanges(dashboardContainer);
      expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('isDirty', function () {
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
