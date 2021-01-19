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
  });
});
