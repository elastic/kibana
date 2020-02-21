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
import { Filter, FilterStateStore } from '../../../common';
import { syncAppFilters } from './sync_app_filters';
import { coreMock } from '../../../../../core/public/mocks';
import { BaseStateContainer, createStateContainer } from '../../../../kibana_utils/public';

const setupMock = coreMock.createSetup();

setupMock.uiSettings.get.mockImplementation((key: string) => {
  return true;
});

describe('sync_app_filters', () => {
  let filterManager: FilterManager;
  let appState: BaseStateContainer<Filter[]>;
  let appStateSub: Subscription;
  let appStateChangeTriggered = jest.fn();
  let filterManagerChangeSub: Subscription;
  let filterManagerChangeTriggered = jest.fn();

  let gF1: Filter;
  let gF2: Filter;
  let aF1: Filter;
  let aF2: Filter;

  beforeEach(() => {
    filterManager = new FilterManager(setupMock.uiSettings);
    appState = createStateContainer([] as Filter[]);
    appStateChangeTriggered = jest.fn();
    appStateSub = appState.state$.subscribe(appStateChangeTriggered);

    filterManagerChangeTriggered = jest.fn();
    filterManagerChangeSub = filterManager.getUpdates$().subscribe(filterManagerChangeTriggered);

    gF1 = getFilter(FilterStateStore.GLOBAL_STATE, true, true, 'key1', 'value1');
    gF2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'key2', 'value2');
    aF1 = getFilter(FilterStateStore.APP_STATE, true, true, 'key3', 'value3');
    aF2 = getFilter(FilterStateStore.APP_STATE, false, false, 'key4', 'value4');
  });
  afterEach(() => {
    appStateSub.unsubscribe();
    filterManagerChangeSub.unsubscribe();
  });

  describe('sync from filterManager to app state', () => {
    test('should sync app filters to app state when new app filters set to filterManager', () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get()).toHaveLength(1);
      stop();
    });

    test('should not sync global filters to app state ', () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, gF2]);

      expect(appState.get()).toHaveLength(0);
      stop();
    });

    test("should not trigger changes when app filters didn't change", () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, aF1]);

      filterManager.setFilters([gF2, aF1]);

      expect(appStateChangeTriggered).toBeCalledTimes(1);
      expect(appState.get()).toHaveLength(1);

      stop();
    });

    test('should trigger changes when app filters change', () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, aF1]);
      filterManager.setFilters([gF1, aF2]);

      expect(appStateChangeTriggered).toBeCalledTimes(2);
      expect(appState.get()).toHaveLength(1);

      stop();
    });

    test('resetting filters should sync to app state', () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get()).toHaveLength(1);

      filterManager.removeAll();

      expect(appState.get()).toHaveLength(0);

      stop();
    });

    test("shouldn't sync filters when syncing is stopped", () => {
      const stop = syncAppFilters(filterManager, appState);

      filterManager.setFilters([gF1, aF1]);

      expect(appState.get()).toHaveLength(1);

      stop();

      filterManager.removeAll();

      expect(appState.get()).toHaveLength(1);
    });
  });
  describe('sync from app state to filterManager', () => {
    test('should pick up initial state from app state', () => {
      appState.set([aF1]);
      filterManager.setFilters([gF1]);

      const stop = syncAppFilters(filterManager, appState);
      expect(filterManager.getFilters()).toHaveLength(2);
      expect(appStateChangeTriggered).toBeCalledTimes(1);

      stop();
    });

    test('changes to app state should be synced to app filters', () => {
      filterManager.setFilters([gF1]);
      const stop = syncAppFilters(filterManager, appState);

      appState.set([aF1]);

      expect(filterManager.getFilters()).toHaveLength(2);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(appStateChangeTriggered).toBeCalledTimes(1);
      stop();
    });

    test('global filters should remain untouched', () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      const stop = syncAppFilters(filterManager, appState);

      appState.set([]);

      expect(filterManager.getFilters()).toHaveLength(2);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
      expect(appStateChangeTriggered).toBeCalledTimes(1);
      stop();
    });

    test("if filters are not changed, filterManager shouldn't trigger update", () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      filterManagerChangeTriggered.mockClear();

      appState.set([aF1, aF2]);
      const stop = syncAppFilters(filterManager, appState);
      appState.set([aF1, aF2]);

      expect(filterManagerChangeTriggered).toBeCalledTimes(0);
      stop();
    });

    test('stop() should stop syncing', () => {
      filterManager.setFilters([gF1, gF2, aF1, aF2]);
      const stop = syncAppFilters(filterManager, appState);
      appState.set([]);
      expect(filterManager.getFilters()).toHaveLength(2);
      stop();
      appState.set([aF1]);
      expect(filterManager.getFilters()).toHaveLength(2);
    });
  });
});
