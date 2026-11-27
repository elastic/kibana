/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import {
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import type { DashboardChangeSource } from '../../../common/change_sources';
import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import { embeddableService } from '../../services/kibana_services';
import { DASHBOARD_DURATION_START_MARK } from '../telemetry/dashboard_duration_start_mark';
import { startTrackingDashboardLoadTelemetry } from '../telemetry/dashboard_load_telemetry';
import { loadDashboardApi } from './load_dashboard_api';
import type { DashboardBackupState } from '../../services/dashboard_backup_service';

jest.mock('../telemetry/dashboard_load_telemetry', () => {
  return {
    startTrackingDashboardLoadTelemetry: jest.fn(),
  };
});

jest.mock('@kbn/content-management-content-insights-public', () => {
  class ContentInsightsClientMock {
    track() {}
  }
  return {
    ContentInsightsClient: ContentInsightsClientMock,
  };
});

jest.mock('../../dashboard_client', () => {
  // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
  const defaultState = require('../../../common/default_dashboard_state');
  return {
    dashboardClient: {
      get: jest.fn().mockResolvedValue({
        data: { ...defaultState.DEFAULT_DASHBOARD_STATE },
      }),
    },
  };
});

const lastSavedQuery = { expression: 'memory:>220000', language: 'kql' as const };
const restoredFilters: NonNullable<DashboardState['filters']> = [
  { type: 'condition', condition: { field: 'response', operator: 'is', value: '404' } },
  { type: 'condition', condition: { field: 'extension', operator: 'is', value: 'css' } },
];
const restoredPinnedPanel = {
  ...DEFAULT_PINNED_CONTROL_STATE,
  id: 'control',
  type: ESQL_CONTROL,
  config: {
    ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
    control_type: 'STATIC_VALUES',
    available_options: ['US', 'IT'],
    variable_name: 'country',
    variable_type: 'values',
    selected_options: ['US'],
  },
} satisfies DashboardState['pinned_panels'][number];
let backupState: DashboardBackupState;

describe('loadDashboardApi', () => {
  const getDashboardApiMock = jest.fn();
  const userActivity$ = new Subject();

  const storeViewModeMock = jest.fn();

  beforeEach(() => {
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    require('../get_dashboard_api').getDashboardApi = getDashboardApiMock;
    getDashboardApiMock.mockReturnValue({
      api: { userActivity$ },
      cleanUp: jest.fn(),
      internalApi: {},
    });

    backupState = { query: lastSavedQuery };
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    require('../../services/dashboard_api_services').getDashboardBackupService = () => ({
      getState: () => backupState,
      storeViewMode: storeViewModeMock,
    });

    window.performance.getEntriesByName = jest.fn().mockReturnValue([
      {
        startTime: 12345,
      },
    ]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialState', () => {
    test('should get initialState from saved object', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
        savedObjectId: '12345',
      });
      expect(getDashboardApiMock).toHaveBeenCalled();
      // @ts-ignore
      expect(getDashboardApiMock.mock.calls[0][0].initialState).toEqual(DEFAULT_DASHBOARD_STATE);
      expect(getDashboardApiMock.mock.calls[0][0].skipReplay).toBe(false);
    });

    test('should overwrite saved object state with unsaved state', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: true,
        }),
        savedObjectId: '12345',
      });
      expect(getDashboardApiMock).toHaveBeenCalled();
      // @ts-ignore
      expect(getDashboardApiMock.mock.calls[0][0].initialState).toEqual({
        ...DEFAULT_DASHBOARD_STATE,
        query: lastSavedQuery,
      });
    });

    // dashboard app passes URL state as override state
    test('should overwrite saved object state and unsaved state with override state', async () => {
      const queryFromUrl = { expression: 'memory:>5000', language: 'kql' as const };
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: true,
          getInitialInput: () => ({
            query: queryFromUrl,
          }),
        }),
        savedObjectId: '12345',
      });
      expect(getDashboardApiMock).toHaveBeenCalled();
      // @ts-ignore
      expect(getDashboardApiMock.mock.calls[0][0].initialState).toEqual({
        ...DEFAULT_DASHBOARD_STATE,
        query: queryFromUrl,
      });
      expect(getDashboardApiMock.mock.calls[0][0].skipReplay).toBe(true);
    });

    test.each<{ name: string; overrides: Partial<DashboardState>; skipReplay: boolean }>([
      { name: 'unchanged query', overrides: { query: lastSavedQuery }, skipReplay: false },
      {
        name: 'reordered and duplicated filters',
        overrides: { filters: [restoredFilters[1], restoredFilters[0], restoredFilters[0]] },
        skipReplay: false,
      },
      {
        name: 'changed filter',
        overrides: {
          filters: [
            restoredFilters[0],
            { type: 'condition', condition: { field: 'extension', operator: 'is', value: 'html' } },
          ],
        },
        skipReplay: true,
      },
      { name: 'cleared filters', overrides: { filters: [] }, skipReplay: true },
      {
        name: 'unchanged pinned panels',
        overrides: { pinned_panels: [{ ...restoredPinnedPanel }] },
        skipReplay: false,
      },
      {
        name: 'changed control selection',
        overrides: {
          pinned_panels: [
            {
              ...restoredPinnedPanel,
              config: { ...restoredPinnedPanel.config, selected_options: ['IT'] },
            },
          ],
        },
        skipReplay: true,
      },
      { name: 'removed pinned panels', overrides: { pinned_panels: [] }, skipReplay: true },
    ])('handles navigation with $name', async ({ overrides, skipReplay }) => {
      backupState = {
        query: lastSavedQuery,
        filters: restoredFilters,
        pinned_panels: [restoredPinnedPanel],
      };

      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: true,
          getInitialInput: () => overrides,
        }),
        savedObjectId: '12345',
      });

      expect(getDashboardApiMock.mock.calls[0][0].skipReplay).toBe(skipReplay);
    });
  });

  describe('change sources', () => {
    test('should strip restored change sources from initialState and seed the allowed ones', async () => {
      backupState = {
        query: lastSavedQuery,
        changedBy: ['unknown', 'agent', 7, null] as unknown as DashboardChangeSource[],
      };

      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: true,
        }),
        savedObjectId: '12345',
      });

      const [{ initialState, changedBy }] = getDashboardApiMock.mock.calls[0];
      expect(initialState).toEqual({
        ...DEFAULT_DASHBOARD_STATE,
        query: lastSavedQuery,
      });
      expect(changedBy).toEqual(['agent']);
    });
  });

  describe('view mode', () => {
    test('passes the view mode from creation options through to getDashboardApi', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
          getInitialInput: () => ({ viewMode: 'non-interactive' }),
        }),
        savedObjectId: '12345',
      });
      expect(getDashboardApiMock).toHaveBeenCalled();
      // @ts-ignore
      expect(getDashboardApiMock.mock.calls[0][0].viewMode).toBe('non-interactive');
    });

    test('backs up an explicit non-"non-interactive" view mode', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
          getInitialInput: () => ({ viewMode: 'view' }),
        }),
        savedObjectId: '12345',
      });
      expect(storeViewModeMock).toHaveBeenCalledWith('view');
    });

    test('never backs up non-interactive view mode, so it cannot be restored on a later load', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
          getInitialInput: () => ({ viewMode: 'non-interactive' }),
        }),
        savedObjectId: '12345',
      });
      expect(storeViewModeMock).not.toHaveBeenCalled();
    });

    test('does not back up view mode when none was explicitly provided', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
        savedObjectId: '12345',
      });
      expect(storeViewModeMock).not.toHaveBeenCalled();
    });
  });

  describe('performance monitoring', () => {
    test('should start performance tracking on load', async () => {
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
        savedObjectId: '12345',
      });

      expect(window.performance.getEntriesByName).toHaveBeenCalledWith(
        DASHBOARD_DURATION_START_MARK,
        'mark'
      );
      expect(startTrackingDashboardLoadTelemetry).toHaveBeenCalledWith(expect.any(Object), {
        firstLoad: true,
        creationStartTime: 12345,
      });
    });
  });

  describe('user activity', () => {
    test('should not track view on load of brand new dashboard', async () => {
      const nextSpy = jest.spyOn(userActivity$, 'next');
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
      });
      expect(nextSpy).toHaveBeenCalledTimes(0);
    });

    test('should track view on load of saved object', async () => {
      const nextSpy = jest.spyOn(userActivity$, 'next');
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
        savedObjectId: '12345',
      });
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'view' }));
    });

    test('gives a duplicate incoming embeddable the id of the panel it duplicates and does not count a view', async () => {
      const nextSpy = jest.spyOn(userActivity$, 'next');
      jest.spyOn(embeddableService, 'getEmbeddableDefinition').mockResolvedValue({
        type: 'customControl',
        buildEmbeddable: jest.fn(),
        isDuplicate: (incomingState: { key?: string }, existingState: { key?: string }) =>
          Boolean(incomingState.key && incomingState.key === existingState.key),
      });

      const duplicateIncoming = [
        {
          type: 'customControl',
          serializedState: { key: 'region' },
        },
      ];

      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
          getIncomingEmbeddables: () => duplicateIncoming,
          getInitialInput: () => ({
            panels: [
              {
                id: 'existingControl',
                type: 'customControl',
                grid: { w: 1, h: 1, x: 0, y: 0 },
                config: { key: 'region' },
              },
            ],
          }),
        }),
        savedObjectId: '12345',
      });

      const [{ incomingEmbeddables }] = getDashboardApiMock.mock.calls[0];
      expect(incomingEmbeddables).toEqual([
        expect.objectContaining({ embeddableId: 'existingControl', type: 'customControl' }),
      ]);
      expect(nextSpy).not.toHaveBeenCalled();
    });
  });
});
