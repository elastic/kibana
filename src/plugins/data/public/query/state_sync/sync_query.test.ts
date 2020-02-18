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
import { createBrowserHistory, History } from 'history';
import { FilterManager } from '../filter_manager';
import { getFilter } from '../filter_manager/test_helpers/get_stub_filter';
import { Filter, FilterStateStore } from '../../../common';
import { coreMock } from '../../../../../core/public/mocks';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
  Storage,
} from '../../../../kibana_utils/public';
import { QueryService, QueryStart } from '../query_service';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { TimefilterContract } from '../timefilter';
import { getQueryStateContainer, QuerySyncState, syncQuery } from './sync_query';

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

describe('sync_query', () => {
  let queryServiceStart: QueryStart;
  let filterManager: FilterManager;
  let timefilter: TimefilterContract;
  let kbnUrlStateStorage: IKbnUrlStateStorage;
  let history: History;

  let filterManagerChangeSub: Subscription;
  let filterManagerChangeTriggered = jest.fn();

  let gF: Filter;
  let aF: Filter;

  const pathWithFilter =
    "/#?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!t,index:'logstash-*',key:query,negate:!t,type:custom,value:'%7B%22match%22:%7B%22key1%22:%22value1%22%7D%7D'),query:(match:(key1:value1)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))";

  beforeEach(() => {
    const queryService = new QueryService();
    queryService.setup({
      uiSettings: setupMock.uiSettings,
      storage: new Storage(new StubBrowserStorage()),
    });
    queryServiceStart = queryService.start(startMock.savedObjects);
    filterManager = queryServiceStart.filterManager;
    timefilter = queryServiceStart.timefilter.timefilter;

    filterManagerChangeTriggered = jest.fn();
    filterManagerChangeSub = filterManager.getUpdates$().subscribe(filterManagerChangeTriggered);

    window.location.href = '/';
    history = createBrowserHistory();
    kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

    gF = getFilter(FilterStateStore.GLOBAL_STATE, true, true, 'key1', 'value1');
    aF = getFilter(FilterStateStore.APP_STATE, true, true, 'key3', 'value3');
  });
  afterEach(() => {
    filterManagerChangeSub.unsubscribe();
  });

  test('url is actually changed when data in services changes', () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    kbnUrlStateStorage.flush(); // sync force location change
    expect(history.location.hash).toMatchInlineSnapshot(
      `"#?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!t,index:'logstash-*',key:query,negate:!t,type:custom,value:'%7B%22match%22:%7B%22key1%22:%22value1%22%7D%7D'),query:(match:(key1:value1)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))"`
    );
    stop();
  });

  test('when filters change, global filters synced to urlStorage', () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    expect(kbnUrlStateStorage.get<QuerySyncState>('_g')?.filters).toHaveLength(1);
    stop();
  });

  test('when time range changes, time synced to urlStorage', () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    timefilter.setTime({ from: 'now-30m', to: 'now' });
    expect(kbnUrlStateStorage.get<QuerySyncState>('_g')?.time).toEqual({
      from: 'now-30m',
      to: 'now',
    });
    stop();
  });

  test('when refresh interval changes, refresh interval is synced to urlStorage', () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    timefilter.setRefreshInterval({ pause: true, value: 100 });
    expect(kbnUrlStateStorage.get<QuerySyncState>('_g')?.refreshInterval).toEqual({
      pause: true,
      value: 100,
    });
    stop();
  });

  test('when url is changed, filters synced back to filterManager', () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    kbnUrlStateStorage.cancel(); // stop initial syncing pending update
    history.push(pathWithFilter);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    stop();
  });

  test('initial url should be synced with services', () => {
    history.push(pathWithFilter);

    const { stop, hasInheritedQueryFromUrl } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    expect(hasInheritedQueryFromUrl).toBe(true);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    stop();
  });

  test("url changes shouldn't trigger services updates if data didn't change", () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    filterManagerChangeTriggered.mockClear();

    history.push(pathWithFilter);
    history.push(pathWithFilter);
    history.push(pathWithFilter);

    expect(filterManagerChangeTriggered).not.toBeCalled();
    stop();
  });

  test("if data didn't change, kbnUrlStateStorage.set shouldn't be called", () => {
    const { stop } = syncQuery(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    const spy = jest.spyOn(kbnUrlStateStorage, 'set');
    filterManager.setFilters([gF]); // global filters didn't change
    expect(spy).not.toBeCalled();
    stop();
  });

  describe('getQueryStateContainer', () => {
    test('state is initialized with state from query service', () => {
      const { stop, querySyncStateContainer, initialState } = getQueryStateContainer(
        queryServiceStart
      );
      expect(querySyncStateContainer.getState()).toMatchInlineSnapshot(`
        Object {
          "filters": Array [],
          "refreshInterval": Object {
            "pause": true,
            "value": 0,
          },
          "time": Object {
            "from": "now-15m",
            "to": "now",
          },
        }
      `);
      expect(initialState).toEqual(querySyncStateContainer.getState());
      stop();
    });

    test('state takes initial overrides into account', () => {
      const { stop, querySyncStateContainer, initialState } = getQueryStateContainer(
        queryServiceStart,
        {
          time: { from: 'now-99d', to: 'now' },
        }
      );
      expect(querySyncStateContainer.getState().time).toEqual({
        from: 'now-99d',
        to: 'now',
      });
      expect(initialState).toEqual(querySyncStateContainer.getState());
      stop();
    });

    test('when filters change, state container contains updated global filters', () => {
      const { stop, querySyncStateContainer } = getQueryStateContainer(queryServiceStart);
      filterManager.setFilters([gF, aF]);
      expect(querySyncStateContainer.getState().filters).toHaveLength(1);
      stop();
    });

    test('when time range changes, state container contains updated time range', () => {
      const { stop, querySyncStateContainer } = getQueryStateContainer(queryServiceStart);
      timefilter.setTime({ from: 'now-30m', to: 'now' });
      expect(querySyncStateContainer.getState().time).toEqual({
        from: 'now-30m',
        to: 'now',
      });
      stop();
    });

    test('when refresh interval changes, state container contains updated refresh interval', () => {
      const { stop, querySyncStateContainer } = getQueryStateContainer(queryServiceStart);
      timefilter.setRefreshInterval({ pause: true, value: 100 });
      expect(querySyncStateContainer.getState().refreshInterval).toEqual({
        pause: true,
        value: 100,
      });
      stop();
    });
  });
});
