/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import type { Filter, Query } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { updateSavedSearch } from './update_saved_search';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { TabStateGlobalState } from '../redux';

describe('updateSavedSearch', () => {
  const query: Query = {
    query: 'extension:jpg',
    language: 'kuery',
  };
  const appFilter: Filter = {
    meta: {},
    query: {
      match_phrase: {
        extension: {
          query: 'jpg',
          type: 'phrase',
        },
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  };
  const globalFilter: Filter = {
    meta: {},
    query: {
      match_phrase: {
        extension: {
          query: 'png',
          type: 'phrase',
        },
      },
    },
    $state: {
      store: FilterStateStore.GLOBAL_STATE,
    },
  };
  const globalState: TabStateGlobalState = { filters: [globalFilter] };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set query and filters from appState and globalState', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
    };
    expect(savedSearch.searchSource.getField('query')).toBeUndefined();
    expect(savedSearch.searchSource.getField('filter')).toBeUndefined();
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState,
      services: discoverServiceMock,
      appState: {
        query,
        filters: [appFilter],
      },
    });
    expect(savedSearch.searchSource.getField('query')).toEqual(query);
    expect(savedSearch.searchSource.getField('filter')).toEqual([globalFilter, appFilter]);
  });

  it('should set time range is timeRestore is enabled', async () => {
    const savedSearch: SavedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
      timeRestore: true,
    };
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState: {
        ...globalState,
        timeRange: {
          from: 'now-666m',
          to: 'now',
        },
      },
      services: discoverServiceMock,
      appState: {
        query,
        filters: [appFilter],
      },
    });
    expect(savedSearch.timeRange).toEqual({
      from: 'now-666m',
      to: 'now',
    });
  });

  it('should not set time range if timeRestore is not enabled', async () => {
    const savedSearch: SavedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
      timeRestore: false,
    };
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState: {
        ...globalState,
        timeRange: {
          from: 'now-666m',
          to: 'now',
        },
      },
      services: discoverServiceMock,
      appState: {
        query,
        filters: [appFilter],
      },
    });
    expect(savedSearch.timeRange).not.toEqual({
      from: 'now-666m',
      to: 'now',
    });
  });

  it('should pass breakdownField if state has breakdownField', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
    };
    expect(savedSearch.breakdownField).toBeUndefined();
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState,
      services: discoverServiceMock,
      appState: {
        breakdownField: 'test',
      },
    });
    expect(savedSearch.breakdownField).toEqual('test');
  });

  it('should pass an empty string if state already has breakdownField', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
      breakdownField: 'test',
    };
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState,
      services: discoverServiceMock,
      appState: {
        breakdownField: undefined,
      },
    });
    expect(savedSearch.breakdownField).toEqual('');
  });

  it('should pass chartInterval if state has interval', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
    };
    expect(savedSearch.chartInterval).toBeUndefined();
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState,
      services: discoverServiceMock,
      appState: {
        interval: 'm',
      },
    });
    expect(savedSearch.chartInterval).toEqual('m');
  });

  it('should pass "auto" if state already has interval', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
      chartInterval: 'm',
    };
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      globalState,
      services: discoverServiceMock,
      appState: {
        interval: undefined,
      },
    });
    expect(savedSearch.chartInterval).toEqual('auto');
  });

  it('should set query and filters from services', async () => {
    const savedSearch = {
      ...savedSearchMock,
      searchSource: savedSearchMock.searchSource.createCopy(),
    };
    expect(savedSearch.searchSource.getField('query')).toBeUndefined();
    expect(savedSearch.searchSource.getField('filter')).toBeUndefined();
    jest
      .spyOn(discoverServiceMock.data.query.filterManager, 'getFilters')
      .mockReturnValue([appFilter, globalFilter]);
    jest.spyOn(discoverServiceMock.data.query.queryString, 'getQuery').mockReturnValue(query);
    updateSavedSearch({
      savedSearch,
      dataView: undefined,
      appState: undefined,
      globalState,
      services: discoverServiceMock,
      useFilterAndQueryServices: true,
    });
    expect(savedSearch.searchSource.getField('query')).toEqual(query);
    expect(savedSearch.searchSource.getField('filter')).toEqual([appFilter, globalFilter]);
  });
});
