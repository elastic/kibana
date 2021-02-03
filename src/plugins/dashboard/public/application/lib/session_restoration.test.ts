/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { dataPluginMock } from '../../../../data/public/mocks';
import { createSessionRestorationDataProvider } from './session_restoration';
import { getAppStateDefaults } from './get_app_state_defaults';
import { getSavedDashboardMock } from '../test_helpers';
import { SavedObjectTagDecoratorTypeGuard } from '../../../../saved_objects_tagging_oss/public';

describe('createSessionRestorationDataProvider', () => {
  const mockDataPlugin = dataPluginMock.createStartContract();
  const searchSessionInfoProvider = createSessionRestorationDataProvider({
    data: mockDataPlugin,
    getAppState: () =>
      getAppStateDefaults(
        getSavedDashboardMock(),
        false,
        ((() => false) as unknown) as SavedObjectTagDecoratorTypeGuard
      ),
    getDashboardTitle: () => 'Dashboard',
    getDashboardId: () => 'Id',
  });

  describe('session state', () => {
    test('restoreState has sessionId and initialState has not', async () => {
      const searchSessionId = 'id';
      (mockDataPlugin.search.session.getSessionId as jest.Mock).mockImplementation(
        () => searchSessionId
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getUrlGeneratorData();
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
      const { initialState, restoreState } = await searchSessionInfoProvider.getUrlGeneratorData();
      expect(initialState.timeRange).toBe(relativeTime);
      expect(restoreState.timeRange).toBe(absoluteTime);
    });

    test('restoreState has refreshInterval paused', async () => {
      const { initialState, restoreState } = await searchSessionInfoProvider.getUrlGeneratorData();
      expect(initialState.refreshInterval).toBeUndefined();
      expect(restoreState.refreshInterval?.pause).toBe(true);
    });
  });
});
