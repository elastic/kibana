/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedDashboardMock } from '../test_helpers';
import { createSessionRestorationDataProvider, savedObjectToDashboardState } from '.';
import { pluginServices } from '../../services/plugin_services';

describe('createSessionRestorationDataProvider', () => {
  const searchSessionInfoProvider = createSessionRestorationDataProvider({
    getAppState: () =>
      savedObjectToDashboardState({
        savedDashboard: getSavedDashboardMock(),
      }),
    getDashboardTitle: () => 'Dashboard',
    getDashboardId: () => 'Id',
  });

  describe('session state', () => {
    test('restoreState has sessionId and initialState has not', async () => {
      const searchSessionId = 'id';
      (
        pluginServices.getServices().data.search.session.getSessionId as jest.Mock
      ).mockImplementation(() => searchSessionId);
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.searchSessionId).toBeUndefined();
      expect(restoreState.searchSessionId).toBe(searchSessionId);
    });

    test('restoreState has absoluteTimeRange', async () => {
      const relativeTime = 'relativeTime';
      const absoluteTime = 'absoluteTime';
      (
        pluginServices.getServices().data.query.timefilter.timefilter.getTime as jest.Mock
      ).mockImplementation(() => relativeTime);
      (
        pluginServices.getServices().data.query.timefilter.timefilter.getAbsoluteTime as jest.Mock
      ).mockImplementation(() => absoluteTime);
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
