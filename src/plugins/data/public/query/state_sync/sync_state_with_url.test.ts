/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import { createBrowserHistory, History } from 'history';
import { FilterManager } from '../filter_manager';
import { getFilter } from '../filter_manager/test_helpers/get_stub_filter';
import { Filter, FilterStateStore, UI_SETTINGS } from '../../../common';
import { coreMock } from '../../../../../core/public/mocks';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
  Storage,
} from '../../../../kibana_utils/public';
import { QueryService, QueryStart } from '../query_service';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { TimefilterContract } from '../timefilter';
import { syncQueryStateWithUrl } from './sync_state_with_url';
import { QueryState } from './types';
import { createNowProviderMock } from '../../now_provider/mocks';

const setupMock = coreMock.createSetup();
const startMock = coreMock.createStart();

setupMock.uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT:
      return true;
    case 'timepicker:timeDefaults':
      return { from: 'now-15m', to: 'now' };
    case 'search:queryLanguage':
      return 'kuery';
    case UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS:
      return { pause: false, value: 0 };
    default:
      throw new Error(`sync_query test: not mocked uiSetting: ${key}`);
  }
});

describe('sync_query_state_with_url', () => {
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
      nowProvider: createNowProviderMock(),
    });
    queryServiceStart = queryService.start({
      uiSettings: startMock.uiSettings,
      storage: new Storage(new StubBrowserStorage()),
      http: startMock.http,
    });
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
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    kbnUrlStateStorage.kbnUrlControls.flush(); // sync force location change
    expect(history.location.hash).toMatchInlineSnapshot(
      `"#?_g=(filters:!(('$state':(store:globalState),meta:(alias:!n,disabled:!t,index:'logstash-*',key:query,negate:!t,type:custom,value:'%7B%22match%22:%7B%22key1%22:%22value1%22%7D%7D'),query:(match:(key1:value1)))),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))"`
    );
    stop();
  });

  test('when filters change, global filters synced to urlStorage', () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    expect(kbnUrlStateStorage.get<QueryState>('_g')?.filters).toHaveLength(1);
    stop();
  });

  test('when time range changes, time synced to urlStorage', () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    timefilter.setTime({ from: 'now-30m', to: 'now' });
    expect(kbnUrlStateStorage.get<QueryState>('_g')?.time).toEqual({
      from: 'now-30m',
      to: 'now',
    });
    stop();
  });

  test('when refresh interval changes, refresh interval is synced to urlStorage', () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    timefilter.setRefreshInterval({ pause: true, value: 100 });
    expect(kbnUrlStateStorage.get<QueryState>('_g')?.refreshInterval).toEqual({
      pause: true,
      value: 100,
    });
    stop();
  });

  test('when url is changed, filters synced back to filterManager', () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    kbnUrlStateStorage.kbnUrlControls.cancel(); // stop initial syncing pending update
    history.push(pathWithFilter);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    stop();
  });

  test('initial url should be synced with services', () => {
    history.push(pathWithFilter);

    const { stop, hasInheritedQueryFromUrl } = syncQueryStateWithUrl(
      queryServiceStart,
      kbnUrlStateStorage
    );
    expect(hasInheritedQueryFromUrl).toBe(true);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    stop();
  });

  test("url changes shouldn't trigger services updates if data didn't change", () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    filterManagerChangeTriggered.mockClear();

    history.push(pathWithFilter);
    history.push(pathWithFilter);
    history.push(pathWithFilter);

    expect(filterManagerChangeTriggered).not.toBeCalled();
    stop();
  });

  test("if data didn't change, kbnUrlStateStorage.set shouldn't be called", () => {
    const { stop } = syncQueryStateWithUrl(queryServiceStart, kbnUrlStateStorage);
    filterManager.setFilters([gF, aF]);
    const spy = jest.spyOn(kbnUrlStateStorage, 'set');
    filterManager.setFilters([gF]); // global filters didn't change
    expect(spy).not.toBeCalled();
    stop();
  });
});
