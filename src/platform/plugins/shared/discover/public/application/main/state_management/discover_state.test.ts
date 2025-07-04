/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverStateContainer } from './discover_state';
import { createSearchSessionRestorationDataProvider } from './discover_state';
import { internalStateActions, selectTabRuntimeState } from './redux';
import type { History } from 'history';
import { createBrowserHistory, createMemoryHistory } from 'history';
import { createSearchSourceMock, dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  savedSearchAdHoc,
  savedSearchMock,
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
  savedSearchMockWithESQL,
} from '../../../__mocks__/saved_search';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getInitialState, type DiscoverAppStateContainer } from './discover_app_state_container';
import { waitFor } from '@testing-library/react';
import { FetchStatus } from '../../types';
import { dataViewAdHoc, dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { copySavedSearch } from './discover_saved_search_container';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';
import { createRuntimeStateManager } from './redux';
import type { HistoryLocationState } from '../../../build_services';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { updateSavedSearch } from './utils/update_saved_search';
import { getConnectedCustomizationService } from '../../../customizations';

const startSync = (appState: DiscoverAppStateContainer) => {
  const { start, stop } = appState.syncState();
  start();
  return stop;
};

let mockServices = createDiscoverServicesMock();

async function getState(
  url: string = '/',
  { savedSearch, isEmptyUrl }: { savedSearch?: SavedSearch; isEmptyUrl?: boolean } = {}
) {
  const nextHistory = createBrowserHistory<HistoryLocationState>();
  nextHistory.push(url);
  mockServices.dataViews.create = jest.fn().mockImplementation((spec) => {
    spec.id = spec.id ?? 'ad-hoc-id';
    spec.title = spec.title ?? 'test';
    return Promise.resolve({
      ...dataViewMock,
      isPersisted: () => false,
      toSpec: () => spec,
      ...spec,
    });
  });
  const runtimeStateManager = createRuntimeStateManager();
  const nextState = getDiscoverStateMock({
    savedSearch: false,
    runtimeStateManager,
    history: nextHistory,
    services: mockServices,
  });
  jest.spyOn(nextState.dataState, 'fetch');
  await nextState.internalState.dispatch(internalStateActions.loadDataViewList());
  nextState.internalState.dispatch(
    internalStateActions.setInitializationState({ hasESData: true, hasUserDataView: true })
  );
  if (savedSearch) {
    jest.spyOn(mockServices.savedSearch, 'get').mockImplementation(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearch));
      return Promise.resolve(savedSearch);
    });
  } else {
    jest.spyOn(mockServices.savedSearch, 'get').mockImplementation(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearchMockWithTimeFieldNew));
      return Promise.resolve(savedSearchMockWithTimeFieldNew);
    });
  }

  const getCurrentUrl = () => nextHistory.createHref(nextHistory.location);
  return {
    history: nextHistory,
    state: nextState,
    customizationService: await getConnectedCustomizationService({
      customizationCallbacks: [],
      stateContainer: nextState,
    }),
    runtimeStateManager,
    getCurrentUrl,
  };
}

describe('Discover state', () => {
  beforeEach(() => {
    mockServices = createDiscoverServicesMock();
  });

  describe('Test discover state', () => {
    let stopSync = () => {};
    let history: History<HistoryLocationState>;
    let state: DiscoverStateContainer;
    const getCurrentUrl = () => history.createHref(history.location);

    beforeEach(async () => {
      history = createBrowserHistory();
      history.push('/');
      state = getDiscoverStateMock({ history });
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
    let history: History<HistoryLocationState>;
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
      state = getDiscoverStateMock({ stateStorageContainer: stateStorage, history });
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
      state.actions.initializeAndSync();
      expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
      state.actions.stopSyncing();
    });

    test('Empty URL should use saved search sort for state', async () => {
      const nextSavedSearch = {
        ...savedSearchMock,
        ...{ sort: [['bytes', 'desc']] as SortOrder[] },
      };
      const { state, customizationService } = await getState('/', { savedSearch: nextSavedSearch });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
      state.actions.stopSyncing();
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
    const history = createBrowserHistory<HistoryLocationState>();
    const mockDataPlugin = dataPluginMock.createStartContract();
    const discoverStateContainer = getDiscoverStateMock({ history });
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
        (
          mockDataPlugin.query.timefilter.timefilter.getAbsoluteTime as jest.Mock
        ).mockImplementation(() => absoluteTime);
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
      mockServices.data.search.session.start = jest.fn(() => nextId);
      state.actions.initializeAndSync();
      expect(state.searchSessionManager.getNextSearchSessionId()).toBe(nextId);
    });
  });

  describe('Test discover state actions', () => {
    beforeEach(async () => {
      mockServices.data.query.timefilter.timefilter.getTime = jest.fn(() => {
        return { from: 'now-15d', to: 'now' };
      });
      mockServices.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
        return { pause: true, value: 1000 };
      });
      mockServices.data.search.searchSource.create = jest
        .fn()
        .mockReturnValue(savedSearchMock.searchSource);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('setDataView', async () => {
      const { state, runtimeStateManager } = await getState('');
      expect(
        selectTabRuntimeState(
          runtimeStateManager,
          state.getCurrentTab().id
        ).currentDataView$.getValue()
      ).toBeUndefined();
      state.actions.setDataView(dataViewMock);
      expect(
        selectTabRuntimeState(
          runtimeStateManager,
          state.getCurrentTab().id
        ).currentDataView$.getValue()
      ).toBe(dataViewMock);
      expect(state.getCurrentTab().dataViewId).toBe(dataViewMock.id);
    });

    test('fetchData', async () => {
      const { state, customizationService } = await getState('/');
      const dataState = state.dataState;
      await state.internalState.dispatch(internalStateActions.loadDataViewList());
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await waitFor(() => {
        expect(dataState.data$.documents$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
      });
      state.actions.stopSyncing();

      expect(dataState.data$.totalHits$.value.result).toBe(0);
      expect(dataState.data$.documents$.value.result).toEqual([]);
    });

    test('loadDataViewList', async () => {
      const { state } = await getState('');
      expect(state.internalState.getState().savedDataViews.length).toBe(3);
    });

    test('loadSavedSearch with no id given an empty URL', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('');
      await state.internalState.dispatch(internalStateActions.loadDataViewList());
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
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
      state.actions.stopSyncing();
    });

    test('loadNewSavedSearch given an empty URL using loadSavedSearch', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('/');
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadNewSavedSearch with URL changing interval state', async () => {
      const { state, customizationService, getCurrentUrl } = await getState(
        '/#?_a=(interval:month,columns:!(bytes))&_g=()',
        { isEmptyUrl: false }
      );
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch with no id, given URL changes state', async () => {
      const { state, customizationService, getCurrentUrl } = await getState(
        '/#?_a=(interval:month,columns:!(bytes))&_g=()',
        { isEmptyUrl: false }
      );
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given an empty URL, no state changes', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      jest.spyOn(mockServices.savedSearch, 'get').mockImplementationOnce(() => {
        const savedSearch = copySavedSearch(savedSearchMock);
        const savedSearchWithDefaults = updateSavedSearch({
          savedSearch,
          state: getInitialState({
            initialUrlState: undefined,
            savedSearch,
            services: mockServices,
          }),
          globalStateContainer: state.globalState,
          services: mockServices,
        });
        return Promise.resolve(savedSearchWithDefaults);
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: 'the-saved-search-id',
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      await new Promise(process.nextTick);
      expect(newSavedSearch?.id).toBe('the-saved-search-id');
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different interval and columns modifying the state', async () => {
      const url = '/#?_a=(interval:month,columns:!(message))&_g=()';
      const { state, customizationService, getCurrentUrl } = await getState(url, {
        savedSearch: savedSearchMock,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(message),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=()"`
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different time range than the stored one showing as changed', async () => {
      const url = '/#_g=(time:(from:now-24h%2Fh,to:now))';
      const savedSearch = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
        timeRestore: true,
        timeRange: { from: 'now-15d', to: 'now' },
      };
      const { state, customizationService } = await getState(url, {
        savedSearch,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different refresh interval than the stored one showing as changed', async () => {
      const url = '/#_g=(time:(from:now-15d,to:now),refreshInterval:(pause:!f,value:1234))';
      mockServices.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
        return { pause: false, value: 1234 };
      });
      const savedSearch = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
        timeRestore: true,
        timeRange: { from: 'now-15d', to: 'now' },
        refreshInterval: { pause: false, value: 60000 },
      };
      const { state, customizationService } = await getState(url, {
        savedSearch,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with matching time range and refresh interval not showing as changed', async () => {
      const url = '/#?_g=(time:(from:now-15d,to:now),refreshInterval:(pause:!f,value:60000))';
      mockServices.data.query.timefilter.timefilter.getRefreshInterval = jest.fn(() => {
        return { pause: false, value: 60000 };
      });
      const savedSearch = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
        timeRestore: true,
        timeRange: { from: 'now-15d', to: 'now' },
        refreshInterval: { pause: false, value: 60000 },
      };
      const { state, customizationService } = await getState(url, {
        savedSearch,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch ignoring hideChart in URL', async () => {
      const url = '/#?_a=(hideChart:true,columns:!(message))&_g=()';
      const { state, customizationService } = await getState(url, { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().hideChart).toBe(undefined);
      expect(state.appState.getState().hideChart).toBe(undefined);
    });

    test('loadSavedSearch without id ignoring invalid index in URL, adding a warning toast', async () => {
      const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
      const { state, customizationService } = await getState(url, {
        savedSearch: savedSearchMock,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
        'the-data-view-id'
      );
      expect(mockServices.toastNotifications.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-test-subj': 'dscDataViewNotFoundShowDefaultWarning',
        })
      );
    });

    test('loadSavedSearch without id containing ES|QL, adding no warning toast with an invalid index', async () => {
      const url =
        "/#?_a=(dataSource:(dataViewId:abcde,type:dataView),query:(esql:'FROM test'))&_g=()";
      const { state, customizationService } = await getState(url, {
        savedSearch: savedSearchMock,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.appState.getState().dataSource).toEqual(createEsqlDataSource());
      expect(mockServices.toastNotifications.addWarning).not.toHaveBeenCalled();
    });

    test('loadSavedSearch with id ignoring invalid index in URL, adding a warning toast', async () => {
      const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
      const { state, customizationService } = await getState(url, {
        savedSearch: savedSearchMock,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
        'the-data-view-id'
      );
      expect(mockServices.toastNotifications.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
        })
      );
    });

    test('loadSavedSearch data view handling', async () => {
      const { state, customizationService, history } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      jest.spyOn(mockServices.savedSearch, 'get').mockImplementationOnce(() => {
        const savedSearch = copySavedSearch(savedSearchMock);
        const savedSearchWithDefaults = updateSavedSearch({
          savedSearch,
          state: getInitialState({
            initialUrlState: undefined,
            savedSearch,
            services: mockServices,
          }),
          globalStateContainer: state.globalState,
          services: mockServices,
        });
        return Promise.resolve(savedSearchWithDefaults);
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
        'the-data-view-id'
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      jest.spyOn(mockServices.savedSearch, 'get').mockImplementationOnce(() => {
        const savedSearch = copySavedSearch(savedSearchMockWithTimeField);
        const savedSearchWithDefaults = updateSavedSearch({
          savedSearch,
          state: getInitialState({
            initialUrlState: undefined,
            savedSearch,
            services: mockServices,
          }),
          globalStateContainer: state.globalState,
          services: mockServices,
        });
        return Promise.resolve(savedSearchWithDefaults);
      });
      history.push('/');
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: 'the-saved-search-id-with-timefield',
            dataViewSpec: undefined,
            defaultUrlState: {},
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
        'index-pattern-with-timefield-id'
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
      jest.spyOn(mockServices.savedSearch, 'get').mockImplementationOnce(() => {
        const savedSearch = copySavedSearch(savedSearchMock);
        const savedSearchWithDefaults = updateSavedSearch({
          savedSearch,
          state: getInitialState({
            initialUrlState: undefined,
            savedSearch,
            services: mockServices,
          }),
          globalStateContainer: state.globalState,
          services: mockServices,
        });
        return Promise.resolve(savedSearchWithDefaults);
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: {
              dataSource: createDataViewDataSource({
                dataViewId: 'index-pattern-with-timefield-id',
              }),
            },
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
        'index-pattern-with-timefield-id'
      );
      expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    });

    test('loadSavedSearch generating a new saved search, updated by ad-hoc data view', async () => {
      const { state, customizationService } = await getState('/');
      const dataViewSpecMock = {
        id: 'mock-id',
        title: 'mock-title',
        timeFieldName: 'mock-time-field-name',
      };
      const dataViewsCreateMock = mockServices.dataViews.create as jest.Mock;
      dataViewsCreateMock.mockImplementationOnce(() => ({
        ...dataViewMock,
        ...dataViewSpecMock,
        isPersisted: () => false,
      }));
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: dataViewSpecMock,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.savedSearchState.getInitial$().getValue().id).toEqual(undefined);
      expect(state.savedSearchState.getCurrent$().getValue().id).toEqual(undefined);
      expect(
        state.savedSearchState.getInitial$().getValue().searchSource?.getField('index')?.id
      ).toEqual(dataViewSpecMock.id);
      expect(
        state.savedSearchState.getCurrent$().getValue().searchSource?.getField('index')?.id
      ).toEqual(dataViewSpecMock.id);
      expect(state.savedSearchState.getHasChanged$().getValue()).toEqual(false);
      expect(state.runtimeStateManager.adHocDataViews$.getValue().length).toBe(1);
    });

    test('loadSavedSearch resetting query & filters of data service', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(mockServices.data.query.queryString.clearQuery).toHaveBeenCalled();
      expect(mockServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([]);
    });

    test('loadSavedSearch setting query & filters of data service if query and filters are persisted', async () => {
      const savedSearchWithQueryAndFilters = copySavedSearch(savedSearchMock);
      const query = { query: "foo: 'bar'", language: 'kql' };
      const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
      savedSearchWithQueryAndFilters.searchSource.setField('query', query);
      savedSearchWithQueryAndFilters.searchSource.setField('filter', filters);
      const { state, customizationService } = await getState('/', {
        savedSearch: savedSearchWithQueryAndFilters,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(mockServices.data.query.queryString.setQuery).toHaveBeenCalledWith(query);
      expect(mockServices.data.query.filterManager.setAppFilters).toHaveBeenCalledWith(filters);
    });

    test('loadSavedSearch with ad-hoc data view being added to internal state adHocDataViews', async () => {
      const savedSearchAdHocCopy = copySavedSearch(savedSearchAdHoc);
      const adHocDataViewId = savedSearchAdHoc.searchSource.getField('index')!.id;
      const { state, customizationService } = await getState('/', {
        savedSearch: savedSearchAdHocCopy,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchAdHoc.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.appState.getState().dataSource).toEqual(
        createDataViewDataSource({ dataViewId: adHocDataViewId! })
      );
      expect(state.runtimeStateManager.adHocDataViews$.getValue()[0].id).toBe(adHocDataViewId);
    });

    test('loadSavedSearch with ES|QL, data view index is not overwritten by URL ', async () => {
      const savedSearchMockWithESQLCopy = copySavedSearch(savedSearchMockWithESQL);
      const persistedDataViewId = savedSearchMockWithESQLCopy?.searchSource.getField('index')!.id;
      const url = "/#?_a=(dataSource:(dataViewId:'the-data-view-id',type:dataView))&_g=()";
      const { state, customizationService } = await getState(url, {
        savedSearch: savedSearchMockWithESQLCopy,
        isEmptyUrl: false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMockWithESQL.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const nextSavedSearch = state.savedSearchState.getState();
      expect(persistedDataViewId).toBe(nextSavedSearch?.searchSource.getField('index')!.id);
    });

    test('transitionFromDataViewToESQL', async () => {
      const savedSearchWithQuery = copySavedSearch(savedSearchMock);
      const query = { query: "foo: 'bar'", language: 'kuery' };
      const filters = [{ meta: { index: 'the-data-view-id' }, query: { match_all: {} } }];
      savedSearchWithQuery.searchSource.setField('query', query);
      savedSearchWithQuery.searchSource.setField('filter', filters);
      const { state } = await getState('/', { savedSearch: savedSearchWithQuery });
      state.globalState?.set({ filters });
      state.appState.set({ query });
      await state.actions.transitionFromDataViewToESQL(dataViewMock);
      expect(state.appState.getState().query).toStrictEqual({
        esql: 'FROM the-data-view-title | WHERE KQL("""foo: \'bar\'""") | LIMIT 10',
      });
      expect(state.globalState?.get?.()?.filters).toStrictEqual([]);
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
      const { state, customizationService, getCurrentUrl } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      const { actions, savedSearchState, dataState } = state;

      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      // test initial state
      expect(dataState.fetch).toHaveBeenCalledTimes(1);
      expect(savedSearchState.getState().searchSource.getField('index')!.id).toBe(dataViewMock.id);
      expect(getCurrentUrl()).toContain(dataViewMock.id);

      // change data view
      await actions.onChangeDataView(dataViewComplexMock.id!);
      await new Promise(process.nextTick);

      // test changed state, fetch should be called once and URL should be updated
      expect(dataState.fetch).toHaveBeenCalledTimes(2);
      expect(state.appState.getState().dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
      );
      expect(savedSearchState.getState().searchSource.getField('index')!.id).toBe(
        dataViewComplexMock.id
      );
      // check if the changed data view is reflected in the URL
      expect(getCurrentUrl()).toContain(dataViewComplexMock.id);
      state.actions.stopSyncing();
    });

    test('onDataViewCreated - persisted data view', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await state.actions.onDataViewCreated(dataViewComplexMock);
      await waitFor(() => {
        expect(state.getCurrentTab().dataViewId).toBe(dataViewComplexMock.id);
      });
      expect(state.appState.getState().dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
        dataViewComplexMock.id
      );
      state.actions.stopSyncing();
    });

    test('onDataViewCreated - ad-hoc data view', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      jest
        .spyOn(mockServices.dataViews, 'get')
        .mockImplementationOnce((id) =>
          id === dataViewAdHoc.id ? Promise.resolve(dataViewAdHoc) : Promise.reject()
        );
      await state.actions.onDataViewCreated(dataViewAdHoc);
      await waitFor(() => {
        expect(state.getCurrentTab().dataViewId).toBe(dataViewAdHoc.id);
      });
      expect(state.appState.getState().dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewAdHoc.id! })
      );
      expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
        dataViewAdHoc.id
      );
      state.actions.stopSyncing();
    });

    test('onDataViewEdited - persisted data view', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      const selectedDataViewId = state.getCurrentTab().dataViewId;
      expect(selectedDataViewId).toBe(dataViewMock.id);
      await state.actions.onDataViewEdited(dataViewMock);
      await waitFor(() => {
        expect(state.getCurrentTab().dataViewId).toBe(selectedDataViewId);
      });
      state.actions.stopSyncing();
    });

    test('onDataViewEdited - ad-hoc data view', async () => {
      const { state } = await getState('/', { savedSearch: savedSearchMock });
      state.actions.initializeAndSync();
      await state.actions.onDataViewCreated(dataViewAdHoc);
      const previousId = dataViewAdHoc.id;
      await state.actions.onDataViewEdited(dataViewAdHoc);
      await waitFor(() => {
        expect(state.getCurrentTab().dataViewId).not.toBe(previousId);
      });
      state.actions.stopSyncing();
    });

    test('onOpenSavedSearch - same target id', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      state.savedSearchState.update({ nextState: { hideChart: true } });
      expect(state.savedSearchState.getState().hideChart).toBe(true);
      state.actions.onOpenSavedSearch(savedSearchMock.id!);
      expect(state.savedSearchState.getState().hideChart).toBe(undefined);
      state.actions.stopSyncing();
    });

    test('onOpenSavedSearch - cleanup of previous filter', async () => {
      const { state, customizationService, history } = await getState(
        "/#?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(columns:!(customer_first_name),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,key:customer_first_name,negate:!f,params:(query:Mary),type:phrase),query:(match_phrase:(customer_first_name:Mary)))),hideChart:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,interval:auto,query:(language:kuery,query:''),sort:!())",
        { savedSearch: savedSearchMock, isEmptyUrl: false }
      );
      jest.spyOn(mockServices.filterManager, 'getAppFilters').mockImplementation(() => {
        return state.appState.getState().filters!;
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.appState.get().filters).toHaveLength(1);
      history.push('/');
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: undefined,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(state.appState.get().filters).toBeUndefined();
    });

    test('onCreateDefaultAdHocDataView', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await state.actions.createAndAppendAdHocDataView({ title: 'ad-hoc-test' });
      expect(state.appState.getState().dataSource).toEqual(
        createDataViewDataSource({ dataViewId: 'ad-hoc-id' })
      );
      expect(state.runtimeStateManager.adHocDataViews$.getValue()[0].id).toBe('ad-hoc-id');
      state.actions.stopSyncing();
    });

    test('undoSavedSearchChanges - when changing data views', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      // Load a given persisted saved search
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      await new Promise(process.nextTick);
      const initialUrlState =
        '/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())';
      expect(getCurrentUrl()).toBe(initialUrlState);
      expect(state.getCurrentTab().dataViewId).toBe(dataViewMock.id!);

      // Change the data view, this should change the URL and trigger a fetch
      await state.actions.onChangeDataView(dataViewComplexMock.id!);
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(),dataSource:(dataViewId:data-view-with-various-field-types-id,type:dataView),interval:auto,sort:!(!(data,desc)))"`
      );
      await waitFor(() => {
        expect(state.dataState.fetch).toHaveBeenCalledTimes(2);
      });
      expect(state.getCurrentTab().dataViewId).toBe(dataViewComplexMock.id!);

      // Undo all changes to the saved search, this should trigger a fetch, again
      await state.actions.undoSavedSearchChanges();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toBe(initialUrlState);
      await waitFor(() => {
        expect(state.dataState.fetch).toHaveBeenCalledTimes(3);
      });
      expect(state.getCurrentTab().dataViewId).toBe(dataViewMock.id!);

      state.actions.stopSyncing();
    });

    test('undoSavedSearchChanges with timeRestore', async () => {
      const { state, customizationService } = await getState('/', {
        savedSearch: {
          ...savedSearchMockWithTimeField,
          timeRestore: true,
          refreshInterval: { pause: false, value: 1000 },
          timeRange: { from: 'now-15d', to: 'now-10d' },
        },
      });
      const setTime = jest.fn();
      const setRefreshInterval = jest.fn();
      mockServices.data.query.timefilter.timefilter.setTime = setTime;
      mockServices.data.query.timefilter.timefilter.setRefreshInterval = setRefreshInterval;
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSession)({
          initializeSessionParams: {
            stateContainer: state,
            customizationService,
            discoverSessionId: savedSearchMock.id,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            shouldClearAllTabs: false,
          },
        })
      );
      expect(setTime).toHaveBeenCalledTimes(1);
      expect(setTime).toHaveBeenLastCalledWith({ from: 'now-15d', to: 'now-10d' });
      expect(setRefreshInterval).toHaveBeenLastCalledWith({ pause: false, value: 1000 });
      await state.actions.undoSavedSearchChanges();
      expect(setTime).toHaveBeenCalledTimes(2);
      expect(setTime).toHaveBeenLastCalledWith({ from: 'now-15d', to: 'now-10d' });
      expect(setRefreshInterval).toHaveBeenCalledWith({ pause: false, value: 1000 });
    });
  });

  describe('Test discover state with embedded mode', () => {
    let stopSync = () => {};
    let history: History<HistoryLocationState>;
    let state: DiscoverStateContainer;
    const getCurrentUrl = () => history.createHref(history.location);

    beforeEach(async () => {
      history = createBrowserHistory();
      history.push('/');
      state = getDiscoverStateMock({
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
});
