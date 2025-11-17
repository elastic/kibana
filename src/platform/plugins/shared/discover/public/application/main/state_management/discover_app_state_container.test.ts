/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { History } from 'history';
import { discoverServiceMock } from '../../../__mocks__/services';
import { getDiscoverAppStateContainer, isEqualState } from './discover_app_state_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { createDataViewDataSource } from '../../../../common/data_sources';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import { getSavedSearchContainer } from './discover_saved_search_container';
import { omit } from 'lodash';
import type { InternalStateStore, TabState } from './redux';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  createTabActionInjector,
  selectTab,
  internalStateActions,
} from './redux';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { createTabsStorageManager, type TabsStorageManager } from './tabs_storage_manager';
import { DiscoverSearchSessionManager } from './discover_search_session';

let history: History;
let stateStorage: IKbnUrlStateStorage;
let internalState: InternalStateStore;
let savedSearchState: DiscoverSavedSearchContainer;
let tabsStorageManager: TabsStorageManager;
let getCurrentTab: () => TabState;

describe('Test discover app state container', () => {
  beforeEach(async () => {
    const storeInSessionStorage = discoverServiceMock.uiSettings.get('state:storeInSessionStorage');
    const toasts = discoverServiceMock.core.notifications.toasts;
    stateStorage = createKbnUrlStateStorage({
      useHash: storeInSessionStorage,
      history,
      ...(toasts && withNotifyOnErrors(toasts)),
    });
    tabsStorageManager = createTabsStorageManager({
      urlStateStorage: stateStorage,
      storage: discoverServiceMock.storage,
    });
    internalState = createInternalStateStore({
      services: discoverServiceMock,
      customizationContext: mockCustomizationContext,
      runtimeStateManager: createRuntimeStateManager(),
      urlStateStorage: stateStorage,
      tabsStorageManager,
      searchSessionManager: new DiscoverSearchSessionManager({
        history: discoverServiceMock.history,
        session: discoverServiceMock.data.search.session,
      }),
    });
    savedSearchState = getSavedSearchContainer({
      services: discoverServiceMock,
      internalState,
      getCurrentTab: () => getCurrentTab(),
    });
    await internalState.dispatch(
      internalStateActions.initializeTabs({ discoverSessionId: savedSearchState.getState()?.id })
    );
    getCurrentTab = () =>
      selectTab(internalState.getState(), internalState.getState().tabs.unsafeCurrentId);
  });

  const getStateContainer = () =>
    getDiscoverAppStateContainer({
      tabId: getCurrentTab().id,
      stateStorage,
      internalState,
      savedSearchContainer: savedSearchState,
      services: discoverServiceMock,
      injectCurrentTab: createTabActionInjector(getCurrentTab().id),
    });

  test('getPrevious returns the state before the current', async () => {
    const state = getStateContainer();
    state.set({
      dataSource: createDataViewDataSource({ dataViewId: 'first' }),
    });
    const stateA = state.get();
    state.set({
      dataSource: createDataViewDataSource({ dataViewId: 'second' }),
    });
    expect(getCurrentTab().previousAppState).toEqual(stateA);
  });

  describe('getAppStateFromSavedSearch', () => {
    const customQuery = {
      language: 'kuery',
      query: '_id: *',
    };

    const defaultQuery = {
      query: '*',
      language: 'kuery',
    };

    const customFilter = {
      $state: {
        store: 'appState',
      },
      meta: {
        alias: null,
        disabled: false,
        field: 'ecs.version',
        index: 'kibana-event-log-data-view',
        key: 'ecs.version',
        negate: false,
        params: {
          query: '1.8.0',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'ecs.version': '1.8.0',
        },
      },
    } as Filter;

    const localSavedSearchMock = {
      id: 'the-saved-search-id',
      title: 'A saved search',
      breakdownField: 'customBreakDownField',
      searchSource: createSearchSourceMock({
        index: dataViewMock,
        filter: [customFilter],
        query: customQuery,
      }),
      hideChart: true,
      rowsPerPage: 250,
      hideAggregatedPreview: true,
      managed: false,
    } as SavedSearch;

    test('should return correct output', () => {
      const state = getStateContainer();
      const appState = state.getAppStateFromSavedSearch(localSavedSearchMock);
      expect(appState).toMatchObject(
        expect.objectContaining({
          breakdownField: 'customBreakDownField',
          columns: ['default_column'],
          filters: [customFilter],
          grid: undefined,
          hideChart: true,
          dataSource: createDataViewDataSource({ dataViewId: 'the-data-view-id' }),
          interval: 'auto',
          query: customQuery,
          rowHeight: undefined,
          headerRowHeight: undefined,
          rowsPerPage: 250,
          hideAggregatedPreview: true,
          savedQuery: undefined,
          sort: [],
          viewMode: undefined,
        })
      );
    });

    test('should return default query if query is undefined', () => {
      const state = getStateContainer();
      discoverServiceMock.data.query.queryString.getDefaultQuery = jest
        .fn()
        .mockReturnValue(defaultQuery);
      const newSavedSearchMock = {
        id: 'new-saved-search-id',
        title: 'A saved search',
        searchSource: createSearchSourceMock({
          index: dataViewMock,
          filter: [customFilter],
          query: undefined,
        }),
        managed: false,
      };
      const appState = state.getAppStateFromSavedSearch(newSavedSearchMock);
      expect(appState).toMatchObject(
        expect.objectContaining({
          breakdownField: undefined,
          columns: ['default_column'],
          filters: [customFilter],
          grid: undefined,
          hideChart: undefined,
          dataSource: createDataViewDataSource({ dataViewId: 'the-data-view-id' }),
          interval: 'auto',
          query: defaultQuery,
          rowHeight: undefined,
          headerRowHeight: undefined,
          rowsPerPage: undefined,
          hideAggregatedPreview: undefined,
          savedQuery: undefined,
          sort: [],
          viewMode: undefined,
        })
      );
    });
  });

  describe('isEqualState', () => {
    const initialState = {
      index: 'the-index',
      columns: ['the-column'],
      sort: [],
      query: { query: 'the-query', language: 'kuery' },
      filters: [],
      interval: 'auto',
      hideChart: true,
      sampleSize: 100,
      viewMode: VIEW_MODE.DOCUMENT_LEVEL,
      savedQuery: undefined,
      hideAggregatedPreview: true,
      rowHeight: 25,
      headerRowHeight: 25,
      grid: {},
      breakdownField: 'the-breakdown-field',
    };

    test('returns true if the states are equal', () => {
      expect(isEqualState(initialState, { ...initialState })).toBeTruthy();
    });

    test('handles the special filter change case correctly ', () => {
      // this is some sort of legacy behavior, especially for the filter case
      const previousState = { initialState, filters: [{ index: 'test', meta: {} }] };
      const nextState = {
        initialState,
        filters: [{ index: 'test', meta: {}, $$hashKey: 'hi' }],
      };
      expect(isEqualState(previousState, nextState)).toBeTruthy();
    });

    test('returns true if the states are not equal', () => {
      const changedParams = [
        { index: 'the-new-index' },
        { columns: ['newColumns'] },
        { sort: [['column', 'desc']] },
        { query: { query: 'ok computer', language: 'pirate-english' } },
        { filters: [{ index: 'test', meta: {} }] },
        { interval: 'eternity' },
        { hideChart: undefined },
        { sampleSize: 1 },
        { viewMode: undefined },
        { savedQuery: 'sdsd' },
        { hideAggregatedPreview: false },
        { rowHeight: 100 },
        { headerRowHeight: 1 },
        { grid: { test: 'test' } },
        { breakdownField: 'new-breakdown-field' },
      ];
      changedParams.forEach((param) => {
        expect(isEqualState(initialState, { ...initialState, ...param })).toBeFalsy();
      });
    });

    test('allows to exclude variables from comparison', () => {
      expect(
        isEqualState(initialState, { ...initialState, dataSource: undefined }, ['dataSource'])
      ).toBeTruthy();
    });
  });

  test('should automatically set ES|QL data source when query is ES|QL', () => {
    const state = getStateContainer();
    state.update({
      dataSource: createDataViewDataSource({ dataViewId: 'test' }),
    });
    expect(state.get().dataSource?.type).toBe('dataView');
    state.update({
      query: {
        esql: 'from test',
      },
    });
    expect(state.get().dataSource?.type).toBe('esql');
  });

  describe('initAndSync', () => {
    it('should call setResetDefaultProfileState correctly with no initial state', () => {
      const state = getStateContainer();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.initAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        hideChart: true,
        rowHeight: true,
        breakdownField: true,
      });
    });

    it('should call setResetDefaultProfileState correctly with initial columns', () => {
      const stateStorageGetSpy = jest.spyOn(stateStorage, 'get');
      stateStorageGetSpy.mockReturnValue({ columns: ['test'] });
      const state = getStateContainer();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.initAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: true,
        rowHeight: true,
        breakdownField: true,
      });
    });

    it('should call setResetDefaultProfileState correctly with initial rowHeight', () => {
      const stateStorageGetSpy = jest.spyOn(stateStorage, 'get');
      stateStorageGetSpy.mockReturnValue({ rowHeight: 5 });
      const state = getStateContainer();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.initAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        hideChart: true,
        rowHeight: false,
        breakdownField: true,
      });
    });

    it('should call setResetDefaultProfileState correctly with initial hide chart', () => {
      const stateStorageGetSpy = jest.spyOn(stateStorage, 'get');
      stateStorageGetSpy.mockReturnValue({ hideChart: true });
      const state = getStateContainer();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.initAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        hideChart: false,
        rowHeight: true,
        breakdownField: true,
      });
    });

    it('should call setResetDefaultProfileState correctly with saved search', () => {
      const stateStorageGetSpy = jest.spyOn(stateStorage, 'get');
      stateStorageGetSpy.mockReturnValue({ columns: ['test'], rowHeight: 5 });
      const savedSearchGetSpy = jest.spyOn(savedSearchState, 'getState');
      savedSearchGetSpy.mockReturnValue({
        id: 'test',
        searchSource: createSearchSourceMock(),
        managed: false,
      });
      const state = getStateContainer();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.initAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
    });
  });

  describe('cascade layout feature flag side effects', () => {
    const cascadeLayoutFeatureFlagSpy = jest.spyOn(
      discoverServiceMock.discoverFeatureFlags,
      'getCascadeLayoutEnabled'
    );

    afterEach(() => {
      // revert to default value
      cascadeLayoutFeatureFlagSpy.mockReturnValue(false);
      cascadeLayoutFeatureFlagSpy.mockClear();
    });

    it('should not compute and set cascade groupings when state updates happen and feature flag evaluation is false', () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(false);

      const stateContainer = getStateContainer();

      stateContainer.update({
        query: { esql: 'FROM my_index | STATS count = Count(message) BY my_field' },
      });

      expect(cascadeLayoutFeatureFlagSpy).toHaveBeenCalled();

      expect(getCurrentTab().uiState.cascadedDocuments).toBeUndefined();
    });

    it('should compute and set cascade groupings when state updates happen and the feature flag evaluation is true', () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(true);

      const stateContainer = getStateContainer();

      stateContainer.update({
        query: { esql: 'FROM my_index | STATS count = Count(message) BY my_field' },
      });

      expect(cascadeLayoutFeatureFlagSpy).toHaveBeenCalled();

      const currentTab = getCurrentTab();

      expect(currentTab.uiState.cascadedDocuments).toBeDefined();

      expect(currentTab.uiState.cascadedDocuments?.availableCascadeGroups).toEqual(['my_field']);

      expect(currentTab.uiState.cascadedDocuments?.selectedCascadeGroups).toEqual(['my_field']);
    });

    it('should respect previous cascade group selection when a state update happens as long as the query has not changed', () => {
      cascadeLayoutFeatureFlagSpy.mockReturnValue(true);

      const initialQuery = {
        esql: 'FROM my_index | STATS count = Count(message) BY field1,field2',
      };

      const stateContainer = getStateContainer();

      // 1. Initial update with query with a group by field.
      stateContainer.update({
        query: initialQuery,
      });

      const currentTabState = getCurrentTab();

      // The initial available groups are ['field1', 'field2'].
      expect(currentTabState.uiState.cascadedDocuments?.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);

      // By default, the first group is selected.
      expect(currentTabState.uiState.cascadedDocuments?.selectedCascadeGroups).toEqual(['field1']);

      // 2. Simulate user selects a valid group that is not the first (e.g., 'field2')
      // We mimic this by directly setting the group selection in UI state.
      // In production, this transition is handled by a separate action;
      // Here we simulate how state update with same query uses previous selection if valid.
      const injectCurrentTab = createTabActionInjector(currentTabState.id);
      internalState.dispatch(
        injectCurrentTab(internalStateActions.setCascadeUiState)({
          cascadeUiState: {
            ...currentTabState.uiState.cascadedDocuments!,
            selectedCascadeGroups: ['field2'],
          },
        })
      );

      expect(getCurrentTab().uiState.cascadedDocuments!.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);
      // select cascade group should be value "field2" now
      expect(getCurrentTab().uiState.cascadedDocuments?.selectedCascadeGroups).toEqual(['field2']);

      // 3. Another state update with the same query, e.g., something else changed, but not the query.
      stateContainer.update({
        columns: ['example'],
        // query field unchanged
        query: initialQuery,
      });

      expect(getCurrentTab().uiState.cascadedDocuments!.availableCascadeGroups).toEqual([
        'field1',
        'field2',
      ]);
      // Still uses ['field2'] as selected group.
      expect(getCurrentTab().uiState.cascadedDocuments!.selectedCascadeGroups).toEqual(['field2']);

      // 4. Now simulate a query change
      stateContainer.update({
        query: { esql: 'FROM my_index | STATS total = Sum(time) BY new_field1, new_field2' },
      });

      // With a new query, we should have new available groups.
      expect(getCurrentTab().uiState.cascadedDocuments!.availableCascadeGroups).toEqual([
        'new_field1',
        'new_field2',
      ]);

      // With a new query, the selected group should be the first group since it's the default.
      expect(getCurrentTab().uiState.cascadedDocuments!.selectedCascadeGroups).toEqual([
        'new_field1',
      ]);
    });
  });
});
