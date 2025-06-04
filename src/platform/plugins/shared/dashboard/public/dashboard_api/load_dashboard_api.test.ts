/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import { loadDashboardApi } from './load_dashboard_api';

jest.mock('./performance/query_performance_tracking', () => {
  return {
    startQueryPerformanceTracking: () => {},
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

const lastSavedQuery = { query: 'memory:>220000', language: 'kuery' };

describe('loadDashboardApi', () => {
  const getDashboardApiMock = jest.fn();

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./get_dashboard_api').getDashboardApi = getDashboardApiMock;
    getDashboardApiMock.mockReturnValue({
      api: {},
      cleanUp: jest.fn(),
      internalApi: {},
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/dashboard_content_management_service').getDashboardContentManagementService =
      () => ({
        loadDashboardState: () => ({
          dashboardFound: true,
          dashboardInput: DEFAULT_DASHBOARD_STATE,
          references: [],
        }),
      });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../services/dashboard_backup_service').getDashboardBackupService = () => ({
      getState: () => ({
        query: lastSavedQuery,
      }),
    });
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
      expect(getDashboardApiMock.mock.calls[0][0].initialState).toEqual({
        ...DEFAULT_DASHBOARD_STATE,
        references: [],
      });
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
        references: [],
        query: lastSavedQuery,
      });
    });

    // dashboard app passes URL state as override state
    test('should overwrite saved object state and unsaved state with override state', async () => {
      const queryFromUrl = { query: 'memory:>5000', language: 'kuery' };
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
        references: [],
        query: queryFromUrl,
      });
    });
  });
});
