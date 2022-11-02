/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DiscoverStateContainer, getDiscoverStateContainer } from './discover_state';
import { waitFor } from '@testing-library/react';
import { createBrowserHistory, History } from 'history';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  savedSearchMock,
  savedSearchMock as mockPersistedSavedSearch,
  savedSearchMockNew as mockNewSavedSearch,
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
} from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { createSearchSessionRestorationDataProvider } from './discover_state_utils';
import { FetchStatus } from '../../types';
import { dataViewMock } from '../../../__mocks__/data_view';

let history: History;
let state: DiscoverStateContainer;
const getCurrentUrl = () => history.createHref(history.location);

jest.mock('@kbn/saved-search-plugin/public', () => ({
  getSavedSearch: jest.fn((id) => {
    if (id) {
      return mockPersistedSavedSearch;
    } else {
      return mockNewSavedSearch;
    }
  }),
  throwErrorOnSavedSearchUrlConflict: jest.fn(),
  getEmptySavedSearch: jest.fn(() => mockNewSavedSearch),
}));

describe('Test discover state', () => {
  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getDiscoverStateContainer({
      services: discoverServiceMock,
      history,
    });
    await state.setAppState({}, true);
    state.actions.subscribe();
  });
  afterEach(() => {
    state.actions.unsubscribe();
  });
  test('setting app state and syncing to URL', async () => {
    state.setAppState({ index: 'modified' });
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),index:modified,interval:auto,sort:!())&_g=()"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(index:modified)');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "modified",
      }
    `);
  });
  test('URL navigation to url without _a, state should not change', async () => {
    history.push('/#?_a=(index:modified)');
    history.push('/');
    expect(state.appState.getState()).toEqual({
      index: 'modified',
    });
  });

  test('getPreviousAppState returns the state before the current', async () => {
    state.setAppState({ index: 'first' });
    const stateA = state.appState.getState();
    state.setAppState({ index: 'second' });
    expect(state.appState.getPrevious()).toEqual(stateA);
  });

  test('pauseAutoRefreshInterval sets refreshInterval.pause to true', async () => {
    history.push('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    await state.actions.pauseAutoRefreshInterval();
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!t,value:5000))');
  });
});
describe('Test discover initial state sort handling', () => {
  test('Non-empty sort in URL should not be overwritten by saved search sort', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!(!(timestamp,desc)))');
    const savedSearch = {
      ...savedSearchMockWithTimeField,
      ...{ sort: [['bytes', 'desc']] },
    } as SavedSearch;

    state = getDiscoverStateContainer({
      savedSearch: undefined,
      services: discoverServiceMock,
      history,
    });
    state.savedSearchState.load = jest.fn(() => Promise.resolve(savedSearch));
    await state.actions.loadSavedSearch(savedSearch.id!, undefined);
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
  });
  test('Empty sort in URL should use saved search sort for state', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!())');
    const nextSavedSearch = { ...savedSearchMock, ...{ sort: [['bytes', 'desc']] as SortOrder[] } };
    state = getDiscoverStateContainer({
      savedSearch: nextSavedSearch,
      services: discoverServiceMock,
      history,
    });
    await state.setAppState({}, true);
    expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
  });
  test('Empty sort in URL and saved search should sort by timestamp', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!())');
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithTimeField,
      services: discoverServiceMock,
      history,
    });
    await state.setAppState({}, true);
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
  });
});

describe('Test discover state with legacy migration', () => {
  test('migration of legacy query ', async () => {
    history = createBrowserHistory();
    history.push(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))"
    );
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithTimeFieldNew,
      services: discoverServiceMock,
      history,
    });
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

describe('createSearchSessionRestorationDataProvider', () => {
  history = createBrowserHistory();
  history.push(
    "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))"
  );
  let mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;
  const mockDataPlugin = dataPluginMock.createStartContract();
  const searchSessionInfoProvider = createSearchSessionRestorationDataProvider({
    data: mockDataPlugin,
    appStateContainer: getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    }).appState,
    getSavedSearch: () => mockSavedSearch,
  });

  describe('session name', () => {
    test('No saved search returns default name', async () => {
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
      const searchSessionId = 'id';
      (mockDataPlugin.search.session.getSessionId as jest.Mock).mockImplementation(
        () => searchSessionId
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
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
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.timeRange).toBe(relativeTime);
      expect(restoreState.timeRange).toBe(absoluteTime);
    });

    test('restoreState has paused autoRefresh', async () => {
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.refreshInterval).toBe(undefined);
      expect(restoreState.refreshInterval).toEqual({
        pause: true,
        value: 0,
      });
    });
  });
});

describe('actions', () => {
  beforeEach(async () => {
    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: 'now-15d', to: 'now' };
    });
    history = createBrowserHistory();
    state = getDiscoverStateContainer({
      services: discoverServiceMock,
      history,
    });
    state.actions.setDataView(dataViewMock);
    // await state.setAppState({ index: dataViewMock.id }, true);

    state.actions.subscribe();
  });
  afterEach(() => {
    state.actions.unsubscribe();
  });
  test('fetch', async () => {
    const dataState = state.dataState;
    expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.UNINITIALIZED);

    state.actions.fetch();
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
  });
  test('loadDataViewList', async () => {
    expect(state.internalState.getState().dataViews.length).toBe(0);
    await state.actions.loadDataViewList();
    expect(state.internalState.getState().dataViews.length).toBe(3);
  });
  test('loadNewSavedSearch given an empty URL', async () => {
    history.push('/');
    const newSavedSearch = await state.actions.loadNewSavedSearch(undefined);
    expect(newSavedSearch?.id).toBeUndefined();
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(false);
  });
  test('loadNewSavedSearch given an empty URL II', async () => {
    history.push('/');
    const newSavedSearch = await state.actions.loadSavedSearch(undefined);
    expect(newSavedSearch?.id).toBeUndefined();
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(false);
  });
  test('loadNewSavedSearch with URL overwriting interval state', async () => {
    history.push('/#?_a=(interval:month,columns:!(bytes))&_g=()');
    const newSavedSearch = await state.actions.loadNewSavedSearch(undefined);
    expect(newSavedSearch?.id).toBeUndefined();
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(true);
  });
  test('loadNewSavedSearch with URL overwriting interval state II', async () => {
    history.push('/#?_a=(interval:month,columns:!(bytes))&_g=()');
    const newSavedSearch = await state.actions.loadSavedSearch(undefined, undefined);
    expect(newSavedSearch?.id).toBeUndefined();
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(true);
  });
  test('loadSavedSearch given an empty URL', async () => {
    history.push('/');
    const newSavedSearch = await state.actions.loadSavedSearch('the-saved-search-id', undefined);
    expect(newSavedSearch?.id).toBe('the-saved-search-id');
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(false);
  });
  test('loadSavedSearch given a URL with interval and columns', async () => {
    history.push('/#?_a=(interval:month,columns:!(message))&_g=()');
    const newSavedSearch = await state.actions.loadSavedSearch('the-saved-search-id', undefined);
    expect(newSavedSearch?.id).toBe('the-saved-search-id');
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(message),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    // URL overwriting state given by savedSearch leads hasChanged$.getValue() to be true
    expect(state.savedSearchState.hasChanged$.getValue()).toBe(true);
  });
});
