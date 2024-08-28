/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterStateStore } from '@kbn/es-query';
import { FilterManager } from './filter_manager';
import { QueryStringContract } from './query_string';
import { getFilter } from './filter_manager/test_helpers/get_stub_filter';
import { UI_SETTINGS } from '../../common';
import { coreMock } from '@kbn/core/public/mocks';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { QueryService, QueryStart } from './query_service';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { TimefilterContract } from './timefilter';
import { createNowProviderMock } from '../now_provider/mocks';

const minRefreshIntervalDefault = 1000;

const setupMock = coreMock.createSetup();
const startMock = coreMock.createStart();

setupMock.uiSettings.get.mockImplementation((key: string) => {
  switch (key) {
    case UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT:
      return true;
    case UI_SETTINGS.SEARCH_QUERY_LANGUAGE:
      return 'kuery';
    case UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS:
      return { from: 'now-15m', to: 'now' };
    case UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS:
      return { pause: false, value: 0 };
    default:
      throw new Error(`query_service test: not mocked uiSetting: ${key}`);
  }
});

describe('query_service', () => {
  let queryServiceStart: QueryStart;
  let filterManager: FilterManager;
  let timeFilter: TimefilterContract;
  let queryStringManager: QueryStringContract;

  beforeEach(() => {
    const queryService = new QueryService();
    queryService.setup({
      uiSettings: setupMock.uiSettings,
      storage: new Storage(new StubBrowserStorage()),
      nowProvider: createNowProviderMock(),
      minRefreshInterval: minRefreshIntervalDefault,
    });
    queryServiceStart = queryService.start({
      uiSettings: setupMock.uiSettings,
      storage: new Storage(new StubBrowserStorage()),
      http: startMock.http,
    });
    filterManager = queryServiceStart.filterManager;
    timeFilter = queryServiceStart.timefilter.timefilter;
    queryStringManager = queryServiceStart.queryString;
  });

  test('implements PersistableState interface', () => {
    expect(queryServiceStart).toHaveProperty('inject');
    expect(queryServiceStart).toHaveProperty('extract');
    expect(queryServiceStart).toHaveProperty('telemetry');
    expect(queryServiceStart).toHaveProperty('migrateToLatest');
    expect(queryServiceStart).toHaveProperty('getAllMigrations');
  });

  test('state is initialized with state from query service', () => {
    const state = queryServiceStart.getState();

    expect(state).toEqual({
      filters: filterManager.getFilters(),
      refreshInterval: timeFilter.getRefreshInterval(),
      time: timeFilter.getTime(),
      query: queryStringManager.getQuery(),
    });
  });

  test('state is updated when underlying state in service updates', () => {
    const filters = [getFilter(FilterStateStore.GLOBAL_STATE, true, true, 'key1', 'value1')];
    const query = { language: 'kql', query: 'query' };
    const time = { from: new Date().toISOString(), to: new Date().toISOString() };
    const refreshInterval = { pause: false, value: 2000 };

    filterManager.setFilters(filters);
    queryStringManager.setQuery(query);
    timeFilter.setTime(time);
    timeFilter.setRefreshInterval(refreshInterval);

    expect(queryServiceStart.getState()).toEqual({
      filters,
      refreshInterval,
      time,
      query,
    });
  });
});
