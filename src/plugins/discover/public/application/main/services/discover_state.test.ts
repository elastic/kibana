/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getDiscoverStateContainer,
  DiscoverStateContainer,
  createSearchSessionRestorationDataProvider,
} from './discover_state';
import { createBrowserHistory, History } from 'history';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { dataViewMock } from '../../../__mocks__/data_view';
import { dataViewComplexMock } from '../../../__mocks__/data_view_complex';

let history: History;
let state: DiscoverStateContainer;
const getCurrentUrl = () => history.createHref(history.location);

describe('Test discover state', () => {
  let stopSync = () => {};

  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    });
    await state.replaceUrlAppState({});
    stopSync = state.startSync();
  });
  afterEach(() => {
    stopSync();
    stopSync = () => {};
  });
  test('setting app state and syncing to URL', async () => {
    state.setAppState({ index: 'modified' });
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),index:modified,interval:auto,sort:!())"`
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

  test('isAppStateDirty returns  whether the current state has changed', async () => {
    state.setAppState({ index: 'modified' });
    expect(state.isAppStateDirty()).toBeTruthy();
    state.resetInitialAppState();
    expect(state.isAppStateDirty()).toBeFalsy();
  });

  test('getPreviousAppState returns the state before the current', async () => {
    state.setAppState({ index: 'first' });
    const stateA = state.appState.getState();
    state.setAppState({ index: 'second' });
    expect(state.getPreviousAppState()).toEqual(stateA);
  });

  test('pauseAutoRefreshInterval sets refreshInterval.pause to true', async () => {
    history.push('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    await state.pauseAutoRefreshInterval();
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!t,value:5000))');
  });
});
describe('Test discover initial state sort handling', () => {
  test('Non-empty sort in URL should not be overwritten by saved search sort', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!(!(order_date,desc)))');

    state = getDiscoverStateContainer({
      savedSearch: { ...savedSearchMock, ...{ sort: [['bytes', 'desc']] } },
      services: discoverServiceMock,
      history,
    });
    await state.replaceUrlAppState({});
    const stopSync = state.startSync();
    expect(state.appState.getState().sort).toEqual([['order_date', 'desc']]);
    stopSync();
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
    await state.replaceUrlAppState({});
    const stopSync = state.startSync();
    expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
    stopSync();
  });
  test('Empty sort in URL and saved search should sort by timestamp', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!())');
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithTimeField,
      services: discoverServiceMock,
      history,
    });
    await state.replaceUrlAppState({});
    const stopSync = state.startSync();
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
    stopSync();
  });
});

describe('Test discover state with legacy migration', () => {
  test('migration of legacy query ', async () => {
    history = createBrowserHistory();
    history.push(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))"
    );
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMock,
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
  let mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;
  history = createBrowserHistory();
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

  describe('actions', () => {
    beforeEach(async () => {
      history = createBrowserHistory();
      state = getDiscoverStateContainer({
        services: discoverServiceMock,
        history,
        savedSearch: savedSearchMock,
      });
    });

    test('setDataView', async () => {
      state.actions.setDataView(dataViewMock);
      expect(state.internalState.getState().dataView).toBe(dataViewMock);
    });

    test('appendAdHocDataViews', async () => {
      state.actions.appendAdHocDataViews(dataViewMock);
      expect(state.internalState.getState().adHocDataViews).toEqual([dataViewMock]);
    });
    test('removeAdHocDataViewById', async () => {
      state.actions.appendAdHocDataViews(dataViewMock);
      state.actions.removeAdHocDataViewById(dataViewMock.id!);
      expect(state.internalState.getState().adHocDataViews).toEqual([]);
    });
    test('replaceAdHocDataViewWithId', async () => {
      state.actions.appendAdHocDataViews(dataViewMock);
      state.actions.replaceAdHocDataViewWithId(dataViewMock.id!, dataViewComplexMock);
      expect(state.internalState.getState().adHocDataViews).toEqual([dataViewComplexMock]);
    });
  });
});
