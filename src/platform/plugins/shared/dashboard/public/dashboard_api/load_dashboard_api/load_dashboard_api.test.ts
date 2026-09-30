/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { Subject } from 'rxjs';
import { DEFAULT_DASHBOARD_STATE } from '../../../common/default_dashboard_state';
import { DASHBOARD_DURATION_START_MARK } from '../telemetry/dashboard_duration_start_mark';
import { startTrackingDashboardLoadTelemetry } from '../telemetry/dashboard_load_telemetry';
import { mockDashboardBackupService } from '../../services/mocks';
import { loadDashboardApi } from './load_dashboard_api';

vi.mock('../telemetry/dashboard_load_telemetry', () => {
  return {
    startTrackingDashboardLoadTelemetry: vi.fn(),
  };
});

vi.mock('@kbn/content-management-content-insights-public', () => {
  class ContentInsightsClientMock {
    track() {}
  }
  return {
    ContentInsightsClient: ContentInsightsClientMock,
  };
});

vi.mock('../../dashboard_client', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const defaultState = await import('../../../common/default_dashboard_state');
  return {
    dashboardClient: {
      get: vi.fn().mockResolvedValue({
        data: { ...defaultState.DEFAULT_DASHBOARD_STATE },
      }),
    },
  };
});

const getDashboardApiMock = vi.hoisted(() => vi.fn());
vi.mock('../get_dashboard_api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getDashboardApi: getDashboardApiMock,
}));

const lastSavedQuery = { expression: 'memory:>220000', language: 'kql' as const };

describe('loadDashboardApi', () => {
  const userActivity$ = new Subject();

  beforeEach(() => {
    getDashboardApiMock.mockReturnValue({
      api: { userActivity$ },
      cleanUp: vi.fn(),
      internalApi: {},
    });

    mockDashboardBackupService.getState.mockReturnValue({
      query: lastSavedQuery,
    });

    window.performance.getEntriesByName = vi.fn().mockReturnValue([
      {
        startTime: 12345,
      },
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      const nextSpy = vi.spyOn(userActivity$, 'next');
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
      });
      expect(nextSpy).toHaveBeenCalledTimes(0);
    });

    test('should track view on load of saved object', async () => {
      const nextSpy = vi.spyOn(userActivity$, 'next');
      await loadDashboardApi({
        getCreationOptions: async () => ({
          useSessionStorageIntegration: false,
        }),
        savedObjectId: '12345',
      });
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'view' }));
    });
  });
});
