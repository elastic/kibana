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
import {
  fromSavedSearchToSavedObjectTab,
  fromTabStateToSavedObjectTab,
  internalStateActions,
  selectHasUnsavedChanges,
  selectTabRuntimeState,
} from './redux';
import type { History } from 'history';
import { createBrowserHistory, createMemoryHistory } from 'history';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  savedSearchAdHoc,
  savedSearchMock as originalSavedSearchMock,
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
  savedSearchMockWithESQL,
} from '../../../__mocks__/saved_search';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getInitialAppState } from './utils/get_initial_app_state';
import { waitFor } from '@testing-library/react';
import { FetchStatus } from '../../types';
import { dataViewAdHoc, dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { copySavedSearch } from './discover_saved_search_container';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../common/data_sources';
import { createRuntimeStateManager } from './redux';
import type { DiscoverServices, HistoryLocationState } from '../../../build_services';
import {
  getDiscoverInternalStateMock,
  getDiscoverStateMock,
} from '../../../__mocks__/discover_state.mock';
import { updateSavedSearch } from './utils/update_saved_search';
import { getConnectedCustomizationService } from '../../../customizations';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getTabStateMock } from './redux/__mocks__/internal_state.mocks';

let mockServices = createDiscoverServicesMock();
let savedSearchMock = copySavedSearch(originalSavedSearchMock);

async function getState(url: string = '/', { savedSearch }: { savedSearch?: SavedSearch } = {}) {
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
  if (savedSearch) {
    savedSearch = copySavedSearch(savedSearch);
    mockServices.data.search.searchSource.create = jest
      .fn()
      .mockReturnValue(savedSearch.searchSource);
  }
  const runtimeStateManager = createRuntimeStateManager();
  const nextState = getDiscoverStateMock({
    savedSearch: savedSearch ?? false,
    runtimeStateManager,
    history: nextHistory,
    services: mockServices,
  });
  jest.spyOn(nextState.dataState, 'fetch');
  nextState.internalState.dispatch(
    internalStateActions.setInitializationState({ hasESData: true, hasUserDataView: true })
  );
  const getCurrentUrl = () => nextHistory.createHref(nextHistory.location);
  return {
    history: nextHistory,
    state: nextState,
    customizationService: await getConnectedCustomizationService({
      customizationCallbacks: [],
      stateContainer: nextState,
      services: mockServices,
    }),
    runtimeStateManager,
    getCurrentUrl,
  };
}

describe('Discover state', () => {
  beforeEach(() => {
    mockServices = createDiscoverServicesMock();
    savedSearchMock = copySavedSearch(originalSavedSearchMock);
  });

  describe('Test discover state', () => {
    let history: History<HistoryLocationState>;
    let state: DiscoverStateContainer;
    const getCurrentUrl = () => history.createHref(history.location);

    beforeEach(async () => {
      history = createBrowserHistory();
      history.push('/');
      state = getDiscoverStateMock({ history });
      state.savedSearchState.set(savedSearchMock);
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppStateAndReplaceUrl)({ appState: {} })
      );
      state.actions.initializeAndSync();
    });

    afterEach(() => {
      state.actions.stopSyncing();
    });

    test('setting app state and syncing to URL', async () => {
      state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: createDataViewDataSource({ dataViewId: 'index-pattern-with-timefield-id' }),
          },
        })
      );
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_tab=(tabId:the-saved-search-id-with-timefield)&_a=(columns:!(default_column),dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!(!(timestamp,desc)))&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15m,to:now))"`
      );
    });

    test('changing URL to be propagated to appState', async () => {
      history.push('/#?_a=(dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView))');
      expect(state.getCurrentTab().appState).toMatchInlineSnapshot(`
              Object {
                "dataSource": Object {
                  "dataViewId": "index-pattern-with-timefield-id",
                  "type": "dataView",
                },
              }
          `);
    });

    test('URL navigation to url without _a, state should not change', async () => {
      history.push('/#?_a=(dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView))');
      history.push('/');
      expect(state.getCurrentTab().appState).toEqual({
        dataSource: createDataViewDataSource({ dataViewId: 'index-pattern-with-timefield-id' }),
      });
    });

    test('getPreviousAppState returns the state before the current', async () => {
      state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: createDataViewDataSource({ dataViewId: 'first' }),
          },
        })
      );
      const stateA = state.getCurrentTab().appState;
      state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: createDataViewDataSource({ dataViewId: 'second' }),
          },
        })
      );
      expect(state.getCurrentTab().previousAppState).toEqual(stateA);
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
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppStateAndReplaceUrl)({ appState: {} })
      );
      state.actions.initializeAndSync();
    });

    afterEach(() => {
      state.actions.stopSyncing();
      jest.useRealTimers();
    });

    test('setting app state and syncing to URL', async () => {
      state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: createDataViewDataSource({ dataViewId: 'index-pattern-with-timefield-id' }),
          },
        })
      );

      await jest.runAllTimersAsync();

      expect(history.createHref(history.location)).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(default_column),dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!(!(timestamp,desc)))&_tab=(tabId:the-saved-search-id-with-timefield)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15m,to:now))"`
      );
    });

    test('changing URL to be propagated to appState', async () => {
      history.push('/#?_a=(dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView))');

      await jest.runAllTimersAsync();

      expect(state.getCurrentTab().appState).toMatchInlineSnapshot(`
              Object {
                "dataSource": Object {
                  "dataViewId": "index-pattern-with-timefield-id",
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
      expect(state.getCurrentTab().appState.sort).toEqual([['timestamp', 'desc']]);
      state.actions.stopSyncing();
    });

    test('Empty URL should use saved search sort for state', async () => {
      const nextSavedSearch = {
        ...savedSearchMock,
        ...{ sort: [['bytes', 'desc']] as SortOrder[] },
      };
      const { state, customizationService } = await getState('/', { savedSearch: nextSavedSearch });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.getCurrentTab().appState.sort).toEqual([['bytes', 'desc']]);
      state.actions.stopSyncing();
    });
  });

  describe('Test discover state with legacy migration', () => {
    test('migration of legacy query ', async () => {
      const { state } = await getState(
        "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))",
        { savedSearch: savedSearchMockWithTimeFieldNew }
      );
      expect(state.getCurrentTab().appState.query).toMatchInlineSnapshot(`
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
    const setupSearchSessionInfoProvider = async ({
      persistedDiscoverSession,
      persistedDataViews,
      services = createDiscoverServicesMock(),
    }: {
      persistedDiscoverSession?: DiscoverSession;
      persistedDataViews?: DataView[];
      services?: DiscoverServices;
    } = {}) => {
      const {
        internalState,
        runtimeStateManager,
        initializeTabs,
        initializeSingleTab,
        getCurrentTab,
      } = getDiscoverInternalStateMock({
        persistedDataViews,
        services,
      });

      await initializeTabs({ persistedDiscoverSession });
      await initializeSingleTab({ tabId: getCurrentTab().id });

      return createSearchSessionRestorationDataProvider({
        data: services.data,
        getPersistedDiscoverSession: () => internalState.getState().persistedDiscoverSession,
        getCurrentTab,
        getCurrentTabRuntimeState: () =>
          selectTabRuntimeState(runtimeStateManager, getCurrentTab().id),
      });
    };

    describe('session name', () => {
      test('No persisted saved search returns default name', async () => {
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider();
        expect(await searchSessionInfoProvider.getName()).toBe('Discover');
      });

      test('Saved Search with a title returns saved search title', async () => {
        const persistedDiscoverSession = createDiscoverSessionMock({ id: 'id', title: 'Name' });
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({
          persistedDiscoverSession,
        });
        expect(await searchSessionInfoProvider.getName()).toBe('Name');
      });

      test('Saved Search without a title returns default name', async () => {
        const persistedDiscoverSession = createDiscoverSessionMock({ id: 'id', title: '' });
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({
          persistedDiscoverSession,
        });
        expect(await searchSessionInfoProvider.getName()).toBe('Discover');
      });
    });

    describe('session state', () => {
      test('restoreState has sessionId and initialState has not', async () => {
        const services = createDiscoverServicesMock();
        const searchSessionId = 'id';
        jest.mocked(services.data.search.session.getSessionId).mockReturnValue(searchSessionId);
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({ services });
        const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
        expect(initialState.searchSessionId).toBeUndefined();
        expect(restoreState.searchSessionId).toBe(searchSessionId);
      });

      test('restoreState has absoluteTimeRange', async () => {
        const services = createDiscoverServicesMock();
        const relativeTime = 'relativeTime';
        const absoluteTime = 'absoluteTime';
        jest
          .mocked(services.data.query.timefilter.timefilter.getTime)
          .mockReturnValue(relativeTime as unknown as TimeRange);
        jest
          .mocked(services.data.query.timefilter.timefilter.getAbsoluteTime)
          .mockReturnValue(absoluteTime as unknown as TimeRange);
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({ services });
        const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
        expect(initialState.timeRange).toBe(relativeTime);
        expect(restoreState.timeRange).toBe(absoluteTime);
      });

      test('restoreState has paused autoRefresh', async () => {
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider();
        const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
        expect(initialState.refreshInterval).toBe(undefined);
        expect(restoreState.refreshInterval).toEqual({
          pause: true,
          value: 0,
        });
      });

      test('restoreState has persisted data view', async () => {
        const services = createDiscoverServicesMock();
        const persistedDiscoverSession = createDiscoverSessionMock({
          id: 'id',
          tabs: [
            fromTabStateToSavedObjectTab({
              tab: getTabStateMock({
                id: 'persisted-tab',
                initialInternalState: {
                  serializedSearchSource: { index: dataViewMock.id },
                },
              }),
              timeRestore: false,
              services,
            }),
          ],
        });
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({
          persistedDiscoverSession,
          persistedDataViews: [dataViewMock],
          services,
        });
        const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
        expect(initialState.dataViewSpec).toEqual(undefined);
        expect(restoreState.dataViewSpec).toEqual(undefined);
        expect(initialState.dataViewId).toEqual(dataViewMock.id);
      });

      test('restoreState has temporary data view', async () => {
        const services = createDiscoverServicesMock();
        const persistedDiscoverSession = createDiscoverSessionMock({
          id: 'id',
          tabs: [
            fromTabStateToSavedObjectTab({
              tab: getTabStateMock({
                id: 'adhoc-tab',
                initialInternalState: {
                  serializedSearchSource: { index: dataViewAdHoc.toSpec() },
                },
              }),
              timeRestore: false,
              services,
            }),
          ],
        });
        const searchSessionInfoProvider = await setupSearchSessionInfoProvider({
          persistedDiscoverSession,
          services,
        });
        const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
        expect(initialState.dataViewSpec).toEqual(dataViewAdHoc.toMinimalSpec());
        expect(restoreState.dataViewSpec).toEqual(dataViewAdHoc.toMinimalSpec());
      });
    });
  });

  describe('Test discover searchSessionManager', () => {
    test('getting the next session id', async () => {
      const { state } = await getState();
      const nextId = 'id';
      mockServices.data.search.session.start = jest.fn(() => nextId);
      state.actions.initializeAndSync();
      expect(state.searchSessionManager.getNextSearchSessionId()).toEqual({
        searchSessionId: nextId,
        isSearchSessionRestored: false,
      });
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
    });

    test('fetchData', async () => {
      const { state, customizationService } = await getState('/');
      const dataState = state.dataState;
      await state.internalState.dispatch(internalStateActions.loadDataViewList());
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
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
      await state.internalState.dispatch(internalStateActions.loadDataViewList());
      expect(state.internalState.getState().savedDataViews.length).toBe(3);
    });

    test('loadSavedSearch with no id given an empty URL', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('');
      await state.internalState.dispatch(internalStateActions.loadDataViewList());
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_tab=(tabId:stable-test-initial-tab-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      const { searchSource, ...savedSearch } = state.savedSearchState.getState();
      expect(savedSearch).toMatchInlineSnapshot(`
              Object {
                "chartInterval": "auto",
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
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toEqual('the-data-view-id');
      state.actions.stopSyncing();
    });

    test('loadNewSavedSearch given an empty URL using loadSavedSearch', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('/');
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_tab=(tabId:stable-test-initial-tab-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:auto,sort:!())"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadNewSavedSearch with URL changing interval state', async () => {
      const { state, customizationService, getCurrentUrl } = await getState(
        '/#?_a=(interval:month,columns:!(bytes))&_g=()'
      );
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_tab=(tabId:stable-test-initial-tab-id)"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch with no id, given URL changes state', async () => {
      const { state, customizationService, getCurrentUrl } = await getState(
        '/#?_a=(interval:month,columns:!(bytes))&_g=()'
      );
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      expect(newSavedSearch?.id).toBeUndefined();
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(bytes),dataSource:(dataViewId:the-data-view-id,type:dataView),interval:month,sort:!())&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_tab=(tabId:stable-test-initial-tab-id)"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given an empty URL, no state changes', async () => {
      const savedSearch = copySavedSearch(savedSearchMock);
      const savedSearchWithDefaults = updateSavedSearch({
        savedSearch,
        dataView: undefined,
        initialInternalState: undefined,
        appState: getInitialAppState({
          initialUrlState: undefined,
          persistedTab: fromSavedSearchToSavedObjectTab({
            tab: { id: 'test', label: 'test' },
            savedSearch,
            services: mockServices,
          }),
          dataView: savedSearch.searchSource.getField('index'),
          services: mockServices,
        }),
        globalState: undefined,
        services: mockServices,
      });
      const { state, customizationService, getCurrentUrl } = await getState('/', {
        savedSearch: savedSearchWithDefaults,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const newSavedSearch = state.savedSearchState.getState();
      await new Promise(process.nextTick);
      expect(newSavedSearch?.id).toBe('the-saved-search-id');
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_tab=(tabId:the-saved-search-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!())"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different interval and columns modifying the state', async () => {
      const url = '/#?_a=(interval:month,columns:!(message))&_g=()';
      const { state, customizationService, getCurrentUrl } = await getState(url, {
        savedSearch: savedSearchMock,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_a=(columns:!(message),dataSource:(dataViewId:the-data-view-id,type:dataView),grid:(),hideChart:!f,interval:month,sort:!())&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_tab=(tabId:the-saved-search-id)"`
      );
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(true);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different time range than the stored one showing as changed', async () => {
      const url = '/#?_g=(time:(from:now-24h%2Fh,to:now))';
      const savedSearch = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({ index: dataViewMock, filter: [] }),
        timeRestore: true,
        timeRange: { from: 'now-15d', to: 'now' },
      };
      const { state, customizationService } = await getState(url, {
        savedSearch,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(true);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch given a URL with different refresh interval than the stored one showing as changed', async () => {
      const url = '/#?_g=(time:(from:now-15d,to:now),refreshInterval:(pause:!f,value:1234))';
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
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(true);
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
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      state.actions.stopSyncing();
    });

    test('loadSavedSearch ignoring hideChart in URL', async () => {
      const url = '/#?_a=(hideChart:true,columns:!(message))&_g=()';
      const { state, customizationService } = await getState(url, { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.savedSearchState.getState().hideChart).toBe(undefined);
      expect(state.getCurrentTab().appState.hideChart).toBe(undefined);
    });

    test('loadSavedSearch without id ignoring invalid index in URL, adding a warning toast', async () => {
      const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
      const { state, customizationService } = await getState(url);
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe('the-data-view-id');
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
        savedSearch: {
          ...savedSearchMock,
          id: undefined,
        },
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.getCurrentTab().appState.dataSource).toEqual(createEsqlDataSource());
      expect(mockServices.toastNotifications.addWarning).not.toHaveBeenCalled();
    });

    test('loadSavedSearch with id ignoring invalid index in URL, adding a warning toast', async () => {
      const url = '/#?_a=(dataSource:(dataViewId:abc,type:dataView))&_g=()';
      const { state, customizationService } = await getState(url, {
        savedSearch: savedSearchMock,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe('the-data-view-id');
      expect(mockServices.toastNotifications.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          'data-test-subj': 'dscDataViewNotFoundShowSavedWarning',
        })
      );
    });

    test('loadSavedSearch data view handling', async () => {
      let savedSearch = copySavedSearch(savedSearchMock);
      let savedSearchWithDefaults = updateSavedSearch({
        savedSearch,
        dataView: undefined,
        initialInternalState: undefined,
        appState: getInitialAppState({
          initialUrlState: undefined,
          persistedTab: fromSavedSearchToSavedObjectTab({
            tab: { id: 'test', label: 'test' },
            savedSearch,
            services: mockServices,
          }),
          dataView: savedSearch.searchSource.getField('index'),
          services: mockServices,
        }),
        globalState: undefined,
        services: mockServices,
      });
      const { state, customizationService, history } = await getState('/', {
        savedSearch: savedSearchWithDefaults,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      let { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe('the-data-view-id');
      let { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      savedSearch = { ...copySavedSearch(savedSearchMockWithTimeField), id: savedSearch.id };
      savedSearchWithDefaults = updateSavedSearch({
        savedSearch,
        dataView: undefined,
        initialInternalState: undefined,
        appState: getInitialAppState({
          initialUrlState: undefined,
          persistedTab: fromSavedSearchToSavedObjectTab({
            tab: { id: 'test', label: 'test' },
            savedSearch,
            services: mockServices,
          }),
          dataView: savedSearch.searchSource.getField('index'),
          services: mockServices,
        }),
        globalState: state.getCurrentTab().globalState,
        services: mockServices,
      });
      mockServices.data.search.searchSource.create = jest
        .fn()
        .mockReturnValue(savedSearchWithDefaults.searchSource);
      jest.spyOn(mockServices.savedSearch, 'getDiscoverSession').mockResolvedValueOnce({
        ...savedSearchWithDefaults,
        id: savedSearchWithDefaults.id ?? '',
        title: savedSearchWithDefaults.title ?? '',
        description: savedSearchWithDefaults.description ?? '',
        tabs: [
          fromSavedSearchToSavedObjectTab({
            tab: {
              id: savedSearchWithDefaults.id ?? '',
              label: savedSearchWithDefaults.title ?? '',
            },
            savedSearch: savedSearchWithDefaults,
            services: mockServices,
          }),
        ],
      });
      await state.internalState.dispatch(
        internalStateActions.initializeTabs({ discoverSessionId: savedSearchWithDefaults.id })
      );
      history.push('/');
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            esqlControls: undefined,
            defaultUrlState: {},
          },
        })
      );
      ({ currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      ));
      expect(currentDataView$.getValue()?.id).toBe('index-pattern-with-timefield-id');
      ({ hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      }));
      expect(hasUnsavedChanges).toBe(false);
      savedSearch = copySavedSearch(savedSearchMock);
      savedSearchWithDefaults = updateSavedSearch({
        savedSearch,
        dataView: undefined,
        initialInternalState: undefined,
        appState: getInitialAppState({
          initialUrlState: undefined,
          persistedTab: fromSavedSearchToSavedObjectTab({
            tab: { id: 'test', label: 'test' },
            savedSearch,
            services: mockServices,
          }),
          dataView: savedSearch.searchSource.getField('index'),
          services: mockServices,
        }),
        globalState: undefined,
        services: mockServices,
      });
      mockServices.data.search.searchSource.create = jest
        .fn()
        .mockReturnValue(savedSearchWithDefaults.searchSource);
      jest.spyOn(mockServices.savedSearch, 'getDiscoverSession').mockResolvedValueOnce({
        ...savedSearchWithDefaults,
        id: savedSearchWithDefaults.id ?? '',
        title: savedSearchWithDefaults.title ?? '',
        description: savedSearchWithDefaults.description ?? '',
        tabs: [
          fromSavedSearchToSavedObjectTab({
            tab: {
              id: savedSearchWithDefaults.id ?? '',
              label: savedSearchWithDefaults.title ?? '',
            },
            savedSearch: savedSearchWithDefaults,
            services: mockServices,
          }),
        ],
      });
      await state.internalState.dispatch(
        internalStateActions.initializeTabs({ discoverSessionId: savedSearchWithDefaults.id })
      );
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            esqlControls: undefined,
            defaultUrlState: {
              dataSource: createDataViewDataSource({
                dataViewId: 'index-pattern-with-timefield-id',
              }),
            },
          },
        })
      );
      ({ currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      ));
      expect(currentDataView$.getValue()?.id).toBe('index-pattern-with-timefield-id');
      ({ hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      }));
      expect(hasUnsavedChanges).toBe(true);
    });

    test('loadSavedSearch generating a new saved search, updated by ad-hoc data view', async () => {
      const { state, customizationService } = await getState('/');
      const dataViewSpecMock = {
        id: 'mock-id',
        title: 'mock-title',
        timeFieldName: 'mock-time-field-name',
      };
      const dataViewsCreateMock = mockServices.dataViews.create as jest.Mock;
      dataViewsCreateMock.mockResolvedValueOnce({
        ...dataViewMock,
        ...dataViewSpecMock,
        isPersisted: () => false,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: dataViewSpecMock,
            defaultUrlState: undefined,
            esqlControls: undefined,
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
      const { hasUnsavedChanges } = selectHasUnsavedChanges(state.internalState.getState(), {
        runtimeStateManager: state.runtimeStateManager,
        services: mockServices,
      });
      expect(hasUnsavedChanges).toBe(false);
      expect(state.runtimeStateManager.adHocDataViews$.getValue().length).toBe(1);
    });

    test('loadSavedSearch resetting query & filters of data service', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
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
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
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
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.getCurrentTab().appState.dataSource).toEqual(
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
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(persistedDataViewId).toBe(currentDataView$.getValue()?.id);
    });

    test('onChangeDataView', async () => {
      const { state, customizationService, getCurrentUrl } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      const { actions, dataState } = state;

      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      // test initial state
      expect(dataState.fetch).toHaveBeenCalledTimes(1);
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe(dataViewMock.id);
      expect(getCurrentUrl()).toContain(dataViewMock.id);

      // change data view
      await actions.onChangeDataView(dataViewComplexMock.id!);
      await new Promise(process.nextTick);

      // test changed state, fetch should be called once and URL should be updated
      expect(dataState.fetch).toHaveBeenCalledTimes(2);
      expect(state.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
      );
      expect(currentDataView$.getValue()?.id).toBe(dataViewComplexMock.id);
      // check if the changed data view is reflected in the URL
      expect(getCurrentUrl()).toContain(dataViewComplexMock.id);
      state.actions.stopSyncing();
    });

    test('onDataViewCreated - persisted data view', async () => {
      const { state, customizationService, runtimeStateManager } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await state.actions.onDataViewCreated(dataViewComplexMock);
      await waitFor(() => {
        expect(
          selectTabRuntimeState(
            runtimeStateManager,
            state.getCurrentTab().id
          ).currentDataView$.getValue()
        ).toBe(dataViewComplexMock);
      });
      expect(state.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewComplexMock.id! })
      );
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe(dataViewComplexMock.id);
      state.actions.stopSyncing();
    });

    test('onDataViewCreated - ad-hoc data view', async () => {
      const { state, customizationService, runtimeStateManager } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
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
        expect(
          selectTabRuntimeState(
            runtimeStateManager,
            state.getCurrentTab().id
          ).currentDataView$.getValue()
        ).toBe(dataViewAdHoc);
      });
      expect(state.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: dataViewAdHoc.id! })
      );
      const { currentDataView$ } = selectTabRuntimeState(
        state.runtimeStateManager,
        state.getCurrentTab().id
      );
      expect(currentDataView$.getValue()?.id).toBe(dataViewAdHoc.id);
      state.actions.stopSyncing();
    });

    test('onDataViewEdited - persisted data view', async () => {
      const { state, customizationService, runtimeStateManager } = await getState('/', {
        savedSearch: savedSearchMock,
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );

      const selectedDataView$ = selectTabRuntimeState(
        runtimeStateManager,
        state.getCurrentTab().id
      ).currentDataView$;
      const selectedDataViewId = selectedDataView$.getValue()?.id;
      expect(selectedDataViewId).toBe(dataViewMock.id);
      await state.actions.onDataViewEdited(dataViewMock);
      await waitFor(() => {
        expect(selectedDataView$.getValue()?.id).toBe(selectedDataViewId);
      });
      state.actions.stopSyncing();
    });

    test('onDataViewEdited - ad-hoc data view', async () => {
      const { state, runtimeStateManager } = await getState('/', { savedSearch: savedSearchMock });
      state.actions.initializeAndSync();
      await state.actions.onDataViewCreated(dataViewAdHoc);
      const previousId = dataViewAdHoc.id;
      await state.actions.onDataViewEdited(dataViewAdHoc);
      await waitFor(() => {
        expect(
          selectTabRuntimeState(
            runtimeStateManager,
            state.getCurrentTab().id
          ).currentDataView$.getValue()?.id
        ).not.toBe(previousId);
      });
      state.actions.stopSyncing();
    });

    test('onOpenSavedSearch - same target id', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.savedSearchState.getState().hideChart).toBe(false);
      state.savedSearchState.update({ nextState: { hideChart: true } });
      expect(state.savedSearchState.getState().hideChart).toBe(true);
      await state.actions.onOpenSavedSearch(savedSearchMock.id!);
      expect(state.savedSearchState.getState().hideChart).toBe(false);
      state.actions.stopSyncing();
    });

    test('onOpenSavedSearch - cleanup of previous filter', async () => {
      const { state, customizationService } = await getState(
        "/#?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(columns:!(customer_first_name),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,key:customer_first_name,negate:!f,params:(query:Mary),type:phrase),query:(match_phrase:(customer_first_name:Mary)))),hideChart:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,interval:auto,query:(language:kuery,query:''),sort:!())",
        { savedSearch: savedSearchMock }
      );
      jest.spyOn(mockServices.filterManager, 'getAppFilters').mockImplementation(() => {
        return state.getCurrentTab().appState.filters!;
      });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(state.getCurrentTab().appState.filters).toHaveLength(1);
      await state.actions.onOpenSavedSearch(savedSearchMock.id!);
      expect(state.getCurrentTab().appState.filters).toBeUndefined();
    });

    test('onCreateDefaultAdHocDataView', async () => {
      const { state, customizationService } = await getState('/', { savedSearch: savedSearchMock });
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await state.actions.createAndAppendAdHocDataView({ title: 'ad-hoc-test' });
      expect(state.getCurrentTab().appState.dataSource).toEqual(
        createDataViewDataSource({ dataViewId: 'ad-hoc-id' })
      );
      expect(state.runtimeStateManager.adHocDataViews$.getValue()[0].id).toBe('ad-hoc-id');
      state.actions.stopSyncing();
    });

    test('resetDiscoverSession - when changing data views', async () => {
      const { state, customizationService, runtimeStateManager, getCurrentUrl } = await getState(
        '/',
        {
          savedSearch: savedSearchMock,
        }
      );
      // Load a given persisted saved search
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toBe(
        '/#?_tab=(tabId:the-saved-search-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!())'
      );
      expect(
        selectTabRuntimeState(
          runtimeStateManager,
          state.getCurrentTab().id
        ).currentDataView$.getValue()?.id
      ).toBe(dataViewMock.id);

      // Change the data view, this should change the URL and trigger a fetch
      await state.actions.onChangeDataView(dataViewComplexMock.id!);
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/#?_tab=(tabId:the-saved-search-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(),dataSource:(dataViewId:data-view-with-various-field-types-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!(!(data,desc)))"`
      );
      await waitFor(() => {
        expect(state.dataState.fetch).toHaveBeenCalledTimes(2);
      });
      expect(
        selectTabRuntimeState(
          runtimeStateManager,
          state.getCurrentTab().id
        ).currentDataView$.getValue()?.id
      ).toBe(dataViewComplexMock.id);

      // Undo all changes to the saved search, this should trigger a fetch, again
      await state.internalState.dispatch(internalStateActions.resetDiscoverSession());
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toBe(
        '/#?_tab=(tabId:the-saved-search-id)&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),dataSource:(dataViewId:the-data-view-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!())'
      );
      await waitFor(() => {
        expect(state.dataState.fetch).toHaveBeenCalledTimes(3);
      });
      expect(
        selectTabRuntimeState(
          runtimeStateManager,
          state.getCurrentTab().id
        ).currentDataView$.getValue()?.id
      ).toBe(dataViewMock.id);

      state.actions.stopSyncing();
    });

    test('resetDiscoverSession with timeRestore', async () => {
      const savedSearch = {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
        refreshInterval: { pause: false, value: 1000 },
        timeRange: { from: 'now-15d', to: 'now-10d' },
      };
      const { state, customizationService } = await getState('/', { savedSearch });
      const setTime = jest.fn();
      const setRefreshInterval = jest.fn();
      mockServices.data.query.timefilter.timefilter.setTime = setTime;
      mockServices.data.query.timefilter.timefilter.setRefreshInterval = setRefreshInterval;
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.initializeSingleTab)({
          initializeSingleTabParams: {
            stateContainer: state,
            customizationService,
            dataViewSpec: undefined,
            defaultUrlState: undefined,
            esqlControls: undefined,
          },
        })
      );
      expect(setTime).toHaveBeenCalledTimes(1);
      expect(setTime).toHaveBeenLastCalledWith({ from: 'now-15d', to: 'now-10d' });
      expect(setRefreshInterval).toHaveBeenLastCalledWith({ pause: false, value: 1000 });
      await state.internalState.dispatch(internalStateActions.resetDiscoverSession());
      expect(setTime).toHaveBeenCalledTimes(2);
      expect(setTime).toHaveBeenLastCalledWith({ from: 'now-15d', to: 'now-10d' });
      expect(setRefreshInterval).toHaveBeenCalledWith({ pause: false, value: 1000 });
    });
  });

  describe('Test discover state with embedded mode', () => {
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
      await state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppStateAndReplaceUrl)({ appState: {} })
      );
      state.actions.initializeAndSync();
    });

    afterEach(() => {
      state.actions.stopSyncing();
    });

    test('setting app state and syncing to URL', async () => {
      state.internalState.dispatch(
        state.injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: createDataViewDataSource({ dataViewId: 'index-pattern-with-timefield-id' }),
          },
        })
      );
      await new Promise(process.nextTick);
      expect(getCurrentUrl()).toMatchInlineSnapshot(
        `"/?_tab=(tabId:the-saved-search-id-with-timefield)&_a=(columns:!(default_column),dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView),grid:(),hideChart:!f,interval:auto,sort:!(!(timestamp,desc)))&_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15m,to:now))"`
      );
    });

    test('changing URL to be propagated to appState', async () => {
      history.push('/?_a=(dataSource:(dataViewId:index-pattern-with-timefield-id,type:dataView))');
      expect(state.getCurrentTab().appState).toMatchObject(
        expect.objectContaining({
          dataSource: createDataViewDataSource({ dataViewId: 'index-pattern-with-timefield-id' }),
        })
      );
    });
  });
});
