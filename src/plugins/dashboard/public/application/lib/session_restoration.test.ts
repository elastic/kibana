/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedDashboardMock } from '../test_helpers';
import { dataPluginMock } from '../../../../data/public/mocks';
import { createSessionRestorationDataProvider, savedObjectToDashboardState } from '.';

describe('createSessionRestorationDataProvider', () => {
  const mockDataPlugin = dataPluginMock.createStartContract();
  const version = '8.0.0';
  const searchSessionInfoProvider = createSessionRestorationDataProvider({
    kibanaVersion: version,
    data: mockDataPlugin,
    getAppState: () =>
      savedObjectToDashboardState({
        version,
        showWriteControls: true,
        usageCollection: undefined,
        savedObjectsTagging: undefined,
        savedDashboard: getSavedDashboardMock(),
      }),
    getDashboardTitle: () => 'Dashboard',
    getDashboardId: () => 'Id',
  });

  describe('session state', () => {
    test('restoreState has sessionId and initialState has not', async () => {
      const searchSessionId = 'id';
      (mockDataPlugin.search.session.getSessionId as jest.Mock).mockImplementation(
        () => searchSessionId
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.searchSessionId).toBeUndefined();
      expect(restoreState.searchSessionId).toBe(searchSessionId);
    });

    test('restoreState has absoluteTimeRange', async () => {
      const relativeTime = 'relativeTime';
      const absoluteTime = 'absoluteTime';
      (mockDataPlugin.query.timefilter.timefilter.getTime as jest.Mock).mockImplementation(
        () => relativeTime
      );
      (mockDataPlugin.query.timefilter.timefilter.getAbsoluteTime as jest.Mock).mockImplementation(
        () => absoluteTime
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.timeRange).toBe(relativeTime);
      expect(restoreState.timeRange).toBe(absoluteTime);
    });

    test('restoreState has refreshInterval paused', async () => {
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.refreshInterval).toBeUndefined();
      expect(restoreState.refreshInterval?.pause).toBe(true);
    });
  });
});
