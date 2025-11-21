/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import { discoverServiceMock } from '../../../__mocks__/services';
import { isEqualState } from './discover_app_state_container';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { createDataViewDataSource } from '../../../../common/data_sources';
import { omit } from 'lodash';
import type { InternalStateStore, TabState } from './redux';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  selectTab,
  internalStateActions,
} from './redux';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { createTabsStorageManager, type TabsStorageManager } from './tabs_storage_manager';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { getDiscoverStateContainer } from './discover_state';

let history: History;
let stateStorage: IKbnUrlStateStorage;
let internalState: InternalStateStore;
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
    await internalState.dispatch(
      internalStateActions.initializeTabs({ discoverSessionId: undefined })
    );
    getCurrentTab = () =>
      selectTab(internalState.getState(), internalState.getState().tabs.unsafeCurrentId);
  });

  const getStateContainer = () =>
    getDiscoverStateContainer({
      tabId: getCurrentTab().id,
      services: discoverServiceMock,
      customizationContext: mockCustomizationContext,
      stateStorageContainer: stateStorage,
      internalState,
      runtimeStateManager: createRuntimeStateManager(),
      searchSessionManager: new DiscoverSearchSessionManager({
        history: discoverServiceMock.history,
        session: discoverServiceMock.data.search.session,
      }),
    });

  test('getPrevious returns the state before the current', async () => {
    getStateContainer();
    internalState.dispatch(
      internalStateActions.setAppState({
        tabId: getCurrentTab().id,
        appState: { dataSource: createDataViewDataSource({ dataViewId: 'first' }) },
      })
    );
    const stateA = getCurrentTab().appState;
    internalState.dispatch(
      internalStateActions.setAppState({
        tabId: getCurrentTab().id,
        appState: { dataSource: createDataViewDataSource({ dataViewId: 'second' }) },
      })
    );
    expect(getCurrentTab().previousAppState).toEqual(stateA);
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
    getStateContainer();
    internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: getCurrentTab().id,
        appState: { dataSource: createDataViewDataSource({ dataViewId: 'test' }) },
      })
    );
    expect(getCurrentTab().appState.dataSource?.type).toBe('dataView');
    internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: getCurrentTab().id,
        appState: { query: { esql: 'from test' } },
      })
    );
    expect(getCurrentTab().appState.dataSource?.type).toBe('esql');
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
      state.actions.initializeAndSync();
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
      state.actions.initializeAndSync();
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
      state.actions.initializeAndSync();
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
      state.actions.initializeAndSync();
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
      const state = getStateContainer();
      const savedSearchGetSpy = jest.spyOn(state.savedSearchState, 'getState');
      savedSearchGetSpy.mockReturnValue({
        id: 'test',
        searchSource: createSearchSourceMock(),
        managed: false,
      });
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
      state.actions.initializeAndSync();
      expect(omit(getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        hideChart: false,
        rowHeight: false,
        breakdownField: false,
      });
    });
  });
});
