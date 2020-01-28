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

import { Subscription } from 'rxjs';
import { FilterManager } from '../filter_manager';
import { getFilter } from '../filter_manager/test_helpers/get_stub_filter';
import { esFilters } from '../../../common';
import { connectToQueryAppState } from './connect_to_app_state';
import { coreMock } from '../../../../../core/public/mocks';
import { BaseStateContainer, createStateContainer, Storage } from '../../../../kibana_utils/public';
import { QueryService, QueryStart } from '../query_service';
import { StubBrowserStorage } from '../../../../../test_utils/public/stub_browser_storage';

const setupMock = coreMock.createSetup();
const startMock = coreMock.createStart();

setupMock.uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case 'filters:pinnedByDefault':
      return true;
    case 'timepicker:timeDefaults':
      return { from: 'now-15m', to: 'now' };
    case 'timepicker:refreshIntervalDefaults':
      return { pause: false, value: 0 };
    default:
      throw new Error(`sync_query test: not mocked uiSetting: ${key}`);
  }
});

describe('connect_to_app_state', () => {
  let queryServiceStart: QueryStart;
  let filterManager: FilterManager;
  let appState: BaseStateContainer<{ filters: esFilters.Filter[] }>;
  let appStateSub: Subscription;
  let appStateChangeTriggered = jest.fn();
  let filterManagerChangeSub: Subscription;
  let filterManagerChangeTriggered = jest.fn();

  let gF1: esFilters.Filter;
  let gF2: esFilters.Filter;
  let aF1: esFilters.Filter;
  let aF2: esFilters.Filter;

  beforeEach(() => {
    const queryService = new QueryService();
    queryService.setup({
      uiSettings: setupMock.uiSettings,
      storage: new Storage(new StubBrowserStorage()),
    });
    queryServiceStart = queryService.start(startMock.savedObjects);
    filterManager = queryServiceStart.filterManager;

    appState = createStateContainer({ filters: [] as esFilters.Filter[] });
    appStateChangeTriggered = jest.fn();
    appStateSub = appState.state$.subscribe(appStateChangeTriggered);

    filterManagerChangeTriggered = jest.fn();
    filterManagerChangeSub = filterManager.getUpdates$().subscribe(filterManagerChangeTriggered);

    gF1 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, true, true, 'key1', 'value1');
    gF2 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, false, false, 'key2', 'value2');
    aF1 = getFilter(esFilters.FilterStateStore.APP_STATE, true, true, 'key3', 'value3');
    aF2 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'key4', 'value4');
  });
  afterEach(() => {
    appStateSub.unsubscribe();
    filterManagerChangeSub.unsubscribe();
  });

  describe('sync from filterManager to app state', () => {
    test('should sync app filters to app state when new app filters set to filterManager', () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get().filters).toHaveLength(1);
      stop();
    });

    test('should not sync global filters to app state ', () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);

      filterManager.setFilters([gF1, gF2]);

      expect(appState.get().filters).toHaveLength(0);
      stop();
    });

    test("should not trigger changes when app filters didn't change", () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appStateChangeTriggered.mockClear();

      filterManager.setFilters([gF1, aF1]);
      filterManager.setFilters([gF2, aF1]);

      expect(appStateChangeTriggered).toBeCalledTimes(1);
      expect(appState.get().filters).toHaveLength(1);

      stop();
    });

    test('should trigger changes when app filters change', () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appStateChangeTriggered.mockClear();

      filterManager.setFilters([gF1, aF1]);
      filterManager.setFilters([gF1, aF2]);

      expect(appStateChangeTriggered).toBeCalledTimes(2);
      expect(appState.get().filters).toHaveLength(1);

      stop();
    });

    test('resetting filters should sync to app state', () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get().filters).toHaveLength(1);

      filterManager.removeAll();

      expect(appState.get().filters).toHaveLength(0);

      stop();
    });

    test("shouldn't sync filters when syncing is stopped", () => {
      const stop = connectToQueryAppState(queryServiceStart, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get().filters).toHaveLength(1);

      stop();

      filterManager.removeAll();

      expect(appState.get().filters).toHaveLength(1);
    });

    test('should pick up initial state from filterManager', () => {
      appState.set({ filters: [aF1] });
      filterManager.setFilters([gF1]);

      appStateChangeTriggered.mockClear();
      const stop = connectToQueryAppState(queryServiceStart, appState);
      expect(appStateChangeTriggered).toBeCalledTimes(1);
      expect(appState.get().filters).toHaveLength(0);

      stop();
    });
  });
  describe('sync from app state to filterManager', () => {
    test('changes to app state should be synced to app filters', () => {
      filterManager.setFilters([gF1]);
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appStateChangeTriggered.mockClear();

      appState.set({ filters: [aF1] });

      expect(filterManager.getFilters()).toHaveLength(2);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(appStateChangeTriggered).toBeCalledTimes(1);
      stop();
    });

    test('global filters should remain untouched', () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appStateChangeTriggered.mockClear();

      appState.set({ filters: [] });

      expect(filterManager.getFilters()).toHaveLength(2);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
      expect(appStateChangeTriggered).toBeCalledTimes(1);
      stop();
    });

    test("if filters are not changed, filterManager shouldn't trigger update", () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      filterManagerChangeTriggered.mockClear();

      appState.set({ filters: [aF1, aF2] });
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appState.set({ filters: [aF1, aF2] });

      expect(filterManagerChangeTriggered).toBeCalledTimes(0);
      stop();
    });

    test('stop() should stop syncing', () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      const stop = connectToQueryAppState(queryServiceStart, appState);
      appState.set({ filters: [] });
      expect(filterManager.getFilters()).toHaveLength(2);
      stop();
      appState.set({ filters: [aF1] });
      expect(filterManager.getFilters()).toHaveLength(2);
    });
  });
});
