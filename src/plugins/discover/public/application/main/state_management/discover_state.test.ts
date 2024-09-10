/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getDiscoverStateContainer,
  DiscoverStateContainer,
  createSearchSessionRestorationDataProvider,
} from './discover_state';
import { createBrowserHistory, createMemoryHistory, History } from 'history';
import { createSearchSourceMock, dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  savedSearchAdHoc,
  savedSearchMock,
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
  savedSearchMockWithESQL,
} from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverAppStateContainer } from './discover_app_state_container';
import { waitFor } from '@testing-library/react';
import { FetchStatus } from '../../types';
import { dataViewAdHoc, dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { copySavedSearch } from './discover_saved_search_container';
import { createKbnUrlStateStorage, IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';

const startSync = (appState: DiscoverAppStateContainer) => {
  const { start, stop } = appState.syncState();
  start();
  return stop;
};

async function getState(
  url: string = '/',
  { savedSearch, isEmptyUrl }: { savedSearch?: SavedSearch; isEmptyUrl?: boolean } = {}
) {
  const nextHistory = createBrowserHistory();
  nextHistory.push(url);

  discoverServiceMock.dataViews.create = jest.fn().mockReturnValue({
    ...dataViewMock,
    isPersisted: () => false,
    id: 'ad-hoc-id',
    title: 'test',
  });

  const nextState = getDiscoverStateContainer({
    services: discoverServiceMock,
    history: nextHistory,
    customizationContext: mockCustomizationContext,
  });
  nextState.appState.isEmptyURL = jest.fn(() => isEmptyUrl ?? true);
  jest.spyOn(nextState.dataState, 'fetch');
  await nextState.actions.loadDataViewList();
  if (savedSearch) {
    nextState.savedSearchState.load = jest.fn(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearch));
      return Promise.resolve(savedSearch);
    });
  } else {
    nextState.savedSearchState.load = jest.fn(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearchMockWithTimeFieldNew));
      return Promise.resolve(savedSearchMockWithTimeFieldNew);
    });
  }

  const getCurrentUrl = () => nextHistory.createHref(nextHistory.location);
  return {
    history: nextHistory,
    state: nextState,
    getCurrentUrl,
  };
}

describe('Test discover state', () => {
  let stopSync = () => {};
  let history: History;
  let state: DiscoverStateContainer;
  const getCurrentUrl = () => history.createHref(history.location);

  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getDiscoverStateContainer({
      services: discoverServiceMock,
      history,
      customizationContext: mockCustomizationContext,
    });
    state.savedSearchState.set(savedSearchMock);
    state.appState.update({}, true);
    stopSync = startSync(state.appState);
  });
  afterEach(() => {
    stopSync();
    stopSync = () => {};
  });
  test('setting app state and syncing to URL', async () => {
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
    });
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),dataSource:(dataViewId:modified,type:dataView),interval:auto,sort:!())"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(dataSource:(dataViewId:modified,type:dataView))');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "dataSource": Object {
          "dataViewId": "modified",
          "type": "dataView",
        },
      }
    `);
  });
  test('URL navigation to url without _a, state should not change', async () => {
    history.push('/#?_a=(dataSource:(dataViewId:modified,type:dataView))');
    history.push('/');
    expect(state.appState.getState()).toEqual({
      dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
    });
  });

  test('isAppStateDirty returns  whether the current state has changed', async () => {
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
    });
    expect(state.appState.hasChanged()).toBeTruthy();
    state.appState.resetInitialState();
    expect(state.appState.hasChanged()).toBeFalsy();
  });

  test('getPreviousAppState returns the state before the current', async () => {
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'first' }),
    });
    const stateA = state.appState.getState();
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'second' }),
    });
    expect(state.appState.getPrevious()).toEqual(stateA);
  });

  test('pauseAutoRefreshInterval sets refreshInterval.pause to true', async () => {
    history.push('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    // TODO: state.actions.setDataView should be async because it calls pauseAutoRefreshInterval which is async.
    // I found this bug while removing unnecessary awaits, but it will need to be fixed in a follow up PR.
    state.actions.setDataView(dataViewMock);
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!t,value:5000))');
  });
});

describe('Test discover state with overridden state storage', () => {
  let stopSync = () => {};
  let history: History;
  let stateStorage: IKbnUrlStateStorage;
  let state: DiscoverStateContainer;

  beforeEach(async () => {
    jest.useFakeTimers();
    history = createMemoryHistory({
      initialEntries: [
        {
          pathname: '/',
          hash: `?_a=()`,
        },
      ],
    });
    stateStorage = createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: true,
    });
    state = getDiscoverStateContainer({
      services: discoverServiceMock,
      history,
      customizationContext: mockCustomizationContext,
      stateStorageContainer: stateStorage,
    });
    state.savedSearchState.set(savedSearchMock);
    state.appState.update({}, true);
    stopSync = startSync(state.appState);
  });

  afterEach(() => {
    stopSync();
    stopSync = () => {};
    jest.useRealTimers();
  });

  test('setting app state and syncing to URL', async () => {
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
    });

    await jest.runAllTimersAsync();

    expect(history.createHref(history.location)).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),dataSource:(dataViewId:modified,type:dataView),interval:auto,sort:!())"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(dataSource:(dataViewId:modified,type:dataView))');

    await jest.runAllTimersAsync();

    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "dataSource": Object {
          "dataViewId": "modified",
          "type": "dataView",
        },
      }
    `);
  });
});

describe('Test discover initial state sort handling', () => {
  test('Non-empty sort in URL should not be overwritten by saved search sort', async () => {
    const savedSearch = {
      ...savedSearchMockWithTimeField,
      ...{ sort: [['bytes', 'desc']] },
    } as SavedSearch;

    const { state } = await getState('/#?_a=(sort:!(!(timestamp,desc)))', { savedSearch });
    const unsubscribe = state.actions.initializeAndSync();
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
    unsubscribe();
  });
  test('Empty URL should use saved search sort for state', async () => {
    const nextSavedSearch = { ...savedSearchMock, ...{ sort: [['bytes', 'desc']] as SortOrder[] } };
    const { state } = await getState('/', { savedSearch: nextSavedSearch });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
    unsubscribe();
  });
});

describe('Test discover state with legacy migration', () => {
  test('migration of legacy query ', async () => {
    const { state } = await getState(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))",
      { savedSearch: savedSearchMockWithTimeFieldNew }
    );
    expect(state.appState.getState().query).toMatchInlineSnapshot(`
      Object {
        "language": "lucene",
        "query": Object {
          "query_string": Object {
            "analyze_wildcard": true,
            "query": "type:nice name:\\"yeah\\"",
          },
        },
      }
    `);
  });
});

describe('Test createSearchSessionRestorationDataProvider', () => {
  let mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;
  const history = createBrowserHistory();
  const mockDataPlugin = dataPluginMock.createStartContract();
  const discoverStateContainer = getDiscoverStateContainer({
    services: discoverServiceMock,
    history,
    customizationContext: mockCustomizationContext,
  });
  discoverStateContainer.appState.update({
    dataSource: createDataViewDataSource({
      dataViewId: savedSearchMock.searchSource.getField('index')!.id!,
    }),
  });
  const searchSessionInfoProvider = createSearchSessionRestorationDataProvider({
    data: mockDataPlugin,
    appStateContainer: discoverStateContainer.appState,
    getSavedSearch: () => mockSavedSearch,
  });

  describe('session name', () => {
    test('No persisted saved search returns default name', async () => {
      expect(await searchSessionInfoProvider.getName()).toBe('Discover');
    });

    test('Saved Search with a title returns saved search title', async () => {
      mockSavedSearch = { id: 'id', title: 'Name' } as unknown as SavedSearch;
      expect(await searchSessionInfoProvider.getName()).toBe('Name');
    });

    test('Saved Search without a title returns default name', async () => {
      mockSavedSearch = { id: 'id', title: undefined } as unknown as SavedSearch;
      expect(await searchSessionInfoProvider.getName()).toBe('Discover');
    });
  });

  describe('session state', () => {
    test('restoreState has sessionId and initialState has not', async () => {
      mockSavedSearch = savedSearchMock;
      const searchSessionId = 'id';
      (mockDataPlugin.search.session.getSessionId as jest.Mock).mockImplementation(
        () => searchSessionId
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.searchSessionId).toBeUndefined();
      expect(restoreState.searchSessionId).toBe(searchSessionId);
    });

    test('restoreState has absoluteTimeRange', async () => {
      mockSavedSearch = savedSearchMock;
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

    test('restoreState has paused autoRefresh', async () => {
      mockSavedSearch = savedSearchMock;
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.refreshInterval).toBe(undefined);
      expect(restoreState.refreshInterval).toEqual({
        pause: true,
        value: 0,
      });
    });

    test('restoreState has persisted data view', async () => {
      mockSavedSearch = savedSearchMock;
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.dataViewSpec).toEqual(undefined);
      expect(restoreState.dataViewSpec).toEqual(undefined);
      expect(initialState.dataViewId).toEqual(savedSearchMock.searchSource.getField('index')?.id);
    });

    test('restoreState has temporary data view', async () => {
      mockSavedSearch = savedSearchAdHoc;
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.dataViewSpec).toEqual({});
      expect(restoreState.dataViewSpec).toEqual({});
    });
  });
});

describe('Test discover searchSessionManager', () => {
  test('getting the next session id', async () => {
    const { state } = await getState();
    const nextId = 'id';
    discoverServiceMock.data.search.session.start = jest.fn(() => nextId);
    state.actions.initializeAndSync();
    expect(state.searchSessionManager.getNextSearchSessionId()).toBe(nextId);
  });
});

describe('Test discover state actions', () => {
  beforeEach(async () => {
    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: 'now-15d', to: 'now' };
    });
    discoverServiceMock.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
      return { pause: true, value: 1000 };
    });
    discoverServiceMock.data.search.searchSource.create = jest
      .fn()
      .mockReturnValue(savedSearchMock.searchSource);
    discoverServiceMock.core.savedObjects.client.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'The saved search that will save the world',
          sort: [],
          columns: ['test123'],
          description: 'description',
          hideChart: false,
        },
        id: 'the-saved-search-id',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'the-data-view-id',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      outcome: 'exactMatch',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('setDataView', async () => {
    const { state } = await getState('');
    state.actions.setDataView(dataViewMock);
    expect(state.internalState.getState().dataView).toBe(dataViewMock);
  });

  test('fetchData', async () => {
    const { state } = await getState('/');
    const dataState = state.dataState;
    await state.actions.loadDataViewList();
    expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    await state.actions.loadSavedSearch();
    const unsubscribe = state.actions.initializeAndSync();
    state.actions.fetchData();
    await waitFor(() => {
      expect(dataState.data$.documents$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    unsubscribe();

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
  });
  test('loadDataViewList', async () => {
    const { state } = await getState('');
    expect(state.internalState.getState().savedDataViews.length).toBe(3);
  });
  test('loadSavedSearch with no id given an empty URL', async () => {
    const { state, getCurrentUrl } = await getState('');
    await state.actions.loadDataViewList();
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    const { searchSource, ...savedSearch } = state.savedSearchState.getState();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "default_column",
        ],
        "density": undefined,
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "refreshInterval": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "sampleSize": undefined,
        "sort": Array [],
        "timeRange": undefined,
      }
    `);
    expect(searchSource.getField('index')?.id).toEqual('the-data-view-id');
    unsubscribe();
  });

  test('loadNewSavedSearch given an empty URL using loadSavedSearch', async () => {
    const { state, getCurrentUrl } = await getState('/');

    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadNewSavedSearch with URL changing interval state', async () => {
    const { state, getCurrentUrl } = await getState(
      '/#?_a=(interval:month,columns:!(bytes))&_g=()',
      { isEmptyUrl: false }
    );
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch with no id, given URL changes state', async () => {
    const { state, getCurrentUrl } = await getState(
      '/#?_a=(interval:month,columns:!(bytes))&_g=()',
      { isEmptyUrl: false }
    );
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch given an empty URL, no state changes', async () => {
    const { state, getCurrentUrl } = await getState('/', { savedSearch: savedSearchMock });
    const newSavedSearch = await state.actions.loadSavedSearch({
      savedSearchId: 'the-saved-search-id',
    });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(newSavedSearch?.id).toBe('the-saved-search-id');
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadSavedSearch given a URL with different interval and columns modifying the state', async () => {
    const url = '/#?_a=(interval:month,columns:!(message))&_g=()';
    const { state, getCurrentUrl } = await getState(url, {
      savedSearch: savedSearchMock,
      isEmptyUrl: false,
    });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(message),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });

  test('loadSavedSearch given a URL with different time range than the stored one showing as changed', async () => {
    const url = '/#_g=(time:(from:now-24h%2Fh,to:now))';
    const savedSearch = {
      ...savedSearchMock,
      searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
      timeRestore: true,
      timeRange: { from: 'now-15d', to: 'now' },
    };
    const { state } = await getState(url, {
      savedSearch,
      isEmptyUrl: false,
    });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });

  test('loadSavedSearch given a URL with different refresh interval than the stored one showing as changed', async () => {
    const url = '/#_g=(time:(from:now-15d,to:now),refreshInterval:(pause:!f,value:1234))';
    discoverServiceMock.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
      return { pause: false, value: 1234 };
    });
    const savedSearch = {
      ...savedSearchMock,
      searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
      timeRestore: true,
      timeRange: { from: 'now-15d', to: 'now' },
      refreshInterval: { pause: false, value: 60000 },
    };
    const { state } = await getState(url, {
      savedSearch,
      isEmptyUrl: false,
    });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });

  test('loadSavedSearch given a URL with matching time range and refresh interval not showing as changed', async () => {
    const url = '/#?_g=(time:(from:now-15d,to:now),refreshInterval:(pause:!f,value:60000))';
    discoverServiceMock.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
      return { pause: false, value: 60000 };
    });
    const savedSearch = {
      ...savedSearchMock,
      searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
      timeRestore: true,
      timeRange: { from: 'now-15d', to: 'now' },
      refreshInterval: { pause: false, value: 60000 },
    };
    const { state } = await getState(url, {
      savedSearch,
      isEmptyUrl: false,
    });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });

  test('loadSavedSearch ignoring hideChart in URL', async () => {
    const url = '/#?_a=(hideChart:true,columns:!(message))&_g=()';
    const { state } = await getState(url, { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch();
    expect(state.savedSearchState.getState().hideChart).toBe(undefined);
    expect(state.appState.getState().hideChart).toBe(undefined);
  });

  test('loadSavedSearch without id ignoring invalid index in URL, adding a warning toast', async () => {
    const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
    const { state } = await getState(url, { savedSearch: savedSearchMock, isEmptyUrl: false });
    await state.actions.loadSavedSearch();
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'the-data-view-id'
    );
    expect(discoverServiceMock.toastNotifications.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'dscDataViewNotFoundShowDefaultWarning',
      })
    );
  });

  test('loadSavedSearch without id containing ES|QL, adding no warning toast with an invalid index', async () => {
    const url =
      "/#?_a=(dataSource:(dataViewId:abcde,type:dataView),query:(esql:'FROM test'))&_g=()";
    const { state } = await getState(url, { savedSearch: savedSearchMock, isEmptyUrl: false });
    await state.actions.loadSavedSearch();
    expect(state.appState.getState().dataSource).toEqual(createEsqlDataSource());
    expect(discoverServiceMock.toastNotifications.addWarning).not.toHaveBeenCalled();
  });

  test('loadSavedSearch with id ignoring invalid index in URL, adding a warning toast', async () => {
    const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
    const { state } = await getState(url, { savedSearch: savedSearchMock, isEmptyUrl: false });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'the-data-view-id'
    );
    expect(discoverServiceMock.toastNotifications.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
      })
    );
  });

  test('loadSavedSearch data view handling', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'the-data-view-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);

    state.savedSearchState.load = jest.fn().mockReturnValue(savedSearchMockWithTimeField);
    // unsetting the previous index else this is considered as update to the persisted saved search
    state.appState.set({
      dataSource: undefined,
    });
    await state.actions.loadSavedSearch({ savedSearchId: 'the-saved-search-id-with-timefield' });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'index-pattern-with-timefield-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);

    // switch back to the previous savedSearch, but not cleaning up appState index, so it's considered as update to the persisted saved search
    state.appState.isEmptyURL = jest.fn().mockReturnValue(false);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'index-pattern-with-timefield-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
  });
  test('loadSavedSearch generating a new saved search, updated by ad-hoc data view', async () => {
    const { state } = await getState('/');
    const dataViewSpecMock = {
      id: 'mock-id',
      title: 'mock-title',
      timeFieldName: 'mock-time-field-name',
    };
    const dataViewsCreateMock = discoverServiceMock.dataViews.create as jest.Mock;
    dataViewsCreateMock.mockImplementationOnce(() => ({
      ...dataViewMock,
      ...dataViewSpecMock,
      isPersisted: () => false,
    }));
    await state.actions.loadSavedSearch({ dataViewSpec: dataViewSpecMock });
    expect(state.savedSearchState.getInitial$().getValue().id).toEqual(undefined);
    expect(state.savedSearchState.getCurrent$().getValue().id).toEqual(undefined);
    expect(
      state.savedSearchState.getInitial$().getValue().searchSource?.getField('index')?.id
    ).toEqual(dataViewSpecMock.id);
    expect(
      state.savedSearchState.getCurrent$().getValue().searchSource?.getField('index')?.id
    ).toEqual(dataViewSpecMock.id);
    expect(state.savedSearchState.getHasChanged$().getValue()).toEqual(false);
    expect(state.internalState.getState().adHocDataViews.length).toBe(1);
  });

  test('loadSavedSearch resetting query & filters of data service', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(discoverServiceMock.data.query.queryString.clearQuery).toHaveBeenCalled();
    expect(discoverServiceMock.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([]);
  });

  test('loadSavedSearch setting query & filters of data service if query and filters are persisted', async () => {
    const savedSearchWithQueryAndFilters = copySavedSearch(savedSearchMock);
    const query = { query: "foo: 'bar'", language: 'kql' };
    const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
    savedSearchWithQueryAndFilters.searchSource.setField('query', query);
    savedSearchWithQueryAndFilters.searchSource.setField('filter', filters);
    const { state } = await getState('/', { savedSearch: savedSearchWithQueryAndFilters });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(discoverServiceMock.data.query.queryString.setQuery).toHaveBeenCalledWith(query);
    expect(discoverServiceMock.data.query.filterManager.setAppFilters).toHaveBeenCalledWith(
      filters
    );
  });

  test('loadSavedSearch with ad-hoc data view being added to internal state adHocDataViews', async () => {
    const savedSearchAdHocCopy = copySavedSearch(savedSearchAdHoc);
    const adHocDataViewId = savedSearchAdHoc.searchSource.getField('index')!.id;
    const { state } = await getState('/', { savedSearch: savedSearchAdHocCopy });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchAdHoc.id });
    expect(state.appState.getState().dataSource).toEqual(
      createDataViewDataSource({ dataViewId: adHocDataViewId! })
    );
    expect(state.internalState.getState().adHocDataViews[0].id).toBe(adHocDataViewId);
  });

  test('loadSavedSearch with ES|QL, data view index is not overwritten by URL ', async () => {
    const savedSearchMockWithESQLCopy = copySavedSearch(savedSearchMockWithESQL);
    const persistedDataViewId = savedSearchMockWithESQLCopy?.searchSource.getField('index')!.id;
    const url = "/#?_a=(dataSource:(dataViewId:'the-data-view-id',type:dataView))&_g=()";
    const { state } = await getState(url, {
      savedSearch: savedSearchMockWithESQLCopy,
      isEmptyUrl: false,
    });
    const nextSavedSearch = await state.actions.loadSavedSearch({
      savedSearchId: savedSearchMockWithESQL.id,
    });
    expect(persistedDataViewId).toBe(nextSavedSearch?.searchSource.getField('index')!.id);
  });

  test('transitionFromDataViewToESQL', async () => {
    const savedSearchWithQuery = copySavedSearch(savedSearchMock);
    const query = { query: "foo: 'bar'", language: 'kuery' };
    const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
    savedSearchWithQuery.searchSource.setField('query', query);
    savedSearchWithQuery.searchSource.setField('filter', filters);
    const { state } = await getState('/', { savedSearch: savedSearchWithQuery });
    await state.actions.transitionFromDataViewToESQL(dataViewMock);
    expect(state.appState.getState().query).toStrictEqual({
      esql: 'FROM the-data-view-title | LIMIT 10',
    });
    expect(state.appState.getState().filters).toStrictEqual([]);
  });

  test('transitionFromESQLToDataView', async () => {
    const savedSearchWithQuery = copySavedSearch(savedSearchMock);
    const query = {
      esql: 'FROM the-data-view-title | LIMIT 10',
    };
    savedSearchWithQuery.searchSource.setField('query', query);
    const { state } = await getState('/', { savedSearch: savedSearchWithQuery });
    await state.actions.transitionFromESQLToDataView('the-data-view-id');
    expect(state.appState.getState().query).toStrictEqual({ query: '', language: 'kuery' });
  });

  test('onChangeDataView', async () => {
    const { state, getCurrentUrl } = await getState('/', { savedSearch: savedSearchMock });
    const { actions, savedSearchState, dataState } = state;

    await actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = actions.initializeAndSync();
    await new Promise(process.nextTick);
    // test initial state
    expect(dataState.fetch).toHaveBeenCalledTimes(0);
    expect(savedSearchState.getState().searchSource.getField('index')!.id).toBe(dataViewMock.id);
    expect(getCurrentUrl()).toContain(dataViewMock.id);

    // change data view
    await actions.onChangeDataView(dataViewComplexMock.id!);
    await new Promise(process.nextTick);

    // test changed state, fetch should be called once and URL should be updated
    expect(dataState.fetch).toHaveBeenCalledTimes(1);
    expect(state.appState.getState().dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
    );
    expect(savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewComplexMock.id
    );
    // check if the changed data view is reflected in the URL
    expect(getCurrentUrl()).toContain(dataViewComplexMock.id);
    unsubscribe();
  });
  test('onDataViewCreated - persisted data view', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.onDataViewCreated(dataViewComplexMock);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewComplexMock.id);
    });
    expect(state.appState.getState().dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
    );
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewComplexMock.id
    );
    unsubscribe();
  });
  test('onDataViewCreated - ad-hoc data view', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.onDataViewCreated(dataViewAdHoc);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewAdHoc.id);
    });
    expect(state.appState.getState().dataSource).toEqual(
      createDataViewDataSource({ dataViewId: dataViewAdHoc.id! })
    );
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewAdHoc.id
    );
    unsubscribe();
  });
  test('onDataViewEdited - persisted data view', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const selectedDataView = state.internalState.getState().dataView;
    await waitFor(() => {
      expect(selectedDataView).toBe(dataViewMock);
    });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.onDataViewEdited(dataViewMock);

    await waitFor(() => {
      expect(state.internalState.getState().dataView).not.toBe(selectedDataView);
    });
    unsubscribe();
  });
  test('onDataViewEdited - ad-hoc data view', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.onDataViewCreated(dataViewAdHoc);
    const previousId = dataViewAdHoc.id;
    await state.actions.onDataViewEdited(dataViewAdHoc);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).not.toBe(previousId);
    });
    unsubscribe();
  });

  test('onOpenSavedSearch - same target id', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    state.savedSearchState.update({ nextState: { hideChart: true } });
    expect(state.savedSearchState.getState().hideChart).toBe(true);
    state.actions.onOpenSavedSearch(savedSearchMock.id!);
    expect(state.savedSearchState.getState().hideChart).toBe(undefined);
    unsubscribe();
  });

  test('onOpenSavedSearch - cleanup of previous filter', async () => {
    const { state } = await getState(
      "/#?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(columns:!(customer_first_name),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,key:customer_first_name,negate:!f,params:(query:Mary),type:phrase),query:(match_phrase:(customer_first_name:Mary)))),hideChart:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,interval:auto,query:(language:kuery,query:''),sort:!())",
      { savedSearch: savedSearchMock, isEmptyUrl: false }
    );
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.appState.get().filters).toHaveLength(1);
    state.appState.isEmptyURL = jest.fn().mockReturnValue(true);
    await state.actions.loadSavedSearch();
    expect(state.appState.get().filters).toHaveLength(0);
  });

  test('onCreateDefaultAdHocDataView', async () => {
    const { state } = await getState('/', { savedSearch: savedSearchMock });
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await state.actions.createAndAppendAdHocDataView({ title: 'ad-hoc-test' });
    expect(state.appState.getState().dataSource).toEqual(
      createDataViewDataSource({ dataViewId: 'ad-hoc-id' })
    );
    expect(state.internalState.getState().adHocDataViews[0].id).toBe('ad-hoc-id');
    unsubscribe();
  });
  test('undoSavedSearchChanges - when changing data views', async () => {
    const { state, getCurrentUrl } = await getState('/', { savedSearch: savedSearchMock });
    // Load a given persisted saved search
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = state.actions.initializeAndSync();
    await new Promise(process.nextTick);
    const initialUrlState =
      '/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())';
    expect(getCurrentUrl()).toBe(initialUrlState);
    expect(state.internalState.getState().dataView?.id).toBe(dataViewMock.id!);

    // Change the data view, this should change the URL and trigger a fetch
    await state.actions.onChangeDataView(dataViewComplexMock.id!);
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(),dataSource:(dataViewId:data-view-with-various-field-types-id,type:dataView),interval:auto,sort:!(!(data,desc)))"`
    );
    await waitFor(() => {
      expect(state.dataState.fetch).toHaveBeenCalledTimes(1);
    });
    expect(state.internalState.getState().dataView?.id).toBe(dataViewComplexMock.id!);

    // Undo all changes to the saved search, this should trigger a fetch, again
    await state.actions.undoSavedSearchChanges();
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toBe(initialUrlState);
    await waitFor(() => {
      expect(state.dataState.fetch).toHaveBeenCalledTimes(2);
    });
    expect(state.internalState.getState().dataView?.id).toBe(dataViewMock.id!);

    unsubscribe();
  });

  test('undoSavedSearchChanges with timeRestore', async () => {
    const { state } = await getState('/', {
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
        refreshInterval: { pause: false, value: 1000 },
        timeRange: { from: 'now-15d', to: 'now-10d' },
      },
    });
    const setTime = jest.fn();
    const setRefreshInterval = jest.fn();
    discoverServiceMock.data.query.timefilter.timefilter.setTime = setTime;
    discoverServiceMock.data.query.timefilter.timefilter.setRefreshInterval = setRefreshInterval;
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    await state.actions.undoSavedSearchChanges();
    expect(setTime).toHaveBeenCalledTimes(1);
    expect(setTime).toHaveBeenCalledWith({ from: 'now-15d', to: 'now-10d' });
    expect(setRefreshInterval).toHaveBeenCalledWith({ pause: false, value: 1000 });
  });
});

describe('Test discover state with embedded mode', () => {
  let stopSync = () => {};
  let history: History;
  let state: DiscoverStateContainer;
  const getCurrentUrl = () => history.createHref(history.location);

  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getDiscoverStateContainer({
      services: discoverServiceMock,
      history,
      customizationContext: {
        ...mockCustomizationContext,
        displayMode: 'embedded',
      },
    });
    state.savedSearchState.set(savedSearchMock);
    state.appState.update({}, true);
    stopSync = startSync(state.appState);
  });

  afterEach(() => {
    stopSync();
    stopSync = () => {};
  });

  test('setting app state and syncing to URL', async () => {
    state.appState.update({
      dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
    });
    await new Promise(process.nextTick);
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/?_a=(columns:!(default_column),dataSource:(dataViewId:modified,type:dataView),interval:auto,sort:!())"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/?_a=(dataSource:(dataViewId:modified,type:dataView))');
    expect(state.appState.getState()).toMatchObject(
      expect.objectContaining({
        dataSource: createDataViewDataSource({ dataViewId: 'modified' }),
      })
    );
  });
});
