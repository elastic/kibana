/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  type PayloadAction,
  configureStore,
  createSlice,
  type ThunkAction,
  type ThunkDispatch,
} from '@reduxjs/toolkit';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { type RuntimeStateManager } from './runtime_state';
import {
  LoadingStatus,
  type DiscoverInternalState,
  type InternalStateDataRequestParams,
  type TabState,
} from './types';
import { loadDataViewList, setTabs } from './actions';
import { selectAllTabs, selectTab } from './selectors';
import { createTabItem } from './utils';

export const defaultTabState: Omit<TabState, keyof TabItem> = {
  lastPersistedGlobalState: {},
  dataViewId: undefined,
  isDataViewLoading: false,
  dataRequestParams: {},
  overriddenVisContextAfterInvalidation: undefined,
  resetDefaultProfileState: {
    resetId: '',
    columns: false,
    rowHeight: false,
    breakdownField: false,
  },
  documentsRequest: {
    loadingStatus: LoadingStatus.Uninitialized,
    result: [],
  },
  totalHitsRequest: {
    loadingStatus: LoadingStatus.Uninitialized,
    result: 0,
  },
  chartRequest: {
    loadingStatus: LoadingStatus.Uninitialized,
    result: {},
  },
};

const initialState: DiscoverInternalState = {
  initializationState: { hasESData: false, hasUserDataView: false },
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  isESQLToDataViewTransitionModalVisible: false,
  tabs: { byId: {}, allIds: [], unsafeCurrentId: '' },
};

export type TabActionPayload<T extends { [key: string]: unknown } = {}> = { tabId: string } & T;

type TabAction<T extends { [key: string]: unknown } = {}> = PayloadAction<TabActionPayload<T>>;

const withTab = <TAction extends TabAction>(
  state: DiscoverInternalState,
  action: TAction,
  fn: (tab: TabState) => void
) => {
  const tab = selectTab(state, action.payload.tabId);

  if (tab) {
    fn(tab);
  }
};

export const internalStateSlice = createSlice({
  name: 'internalState',
  initialState,
  reducers: {
    setInitializationState: (
      state,
      action: PayloadAction<DiscoverInternalState['initializationState']>
    ) => {
      state.initializationState = action.payload;
    },

    setTabs: (state, action: PayloadAction<{ allTabs: TabState[]; selectedTabId: string }>) => {
      state.tabs.byId = action.payload.allTabs.reduce<Record<string, TabState>>(
        (acc, tab) => ({
          ...acc,
          [tab.id]: tab,
        }),
        {}
      );
      state.tabs.allIds = action.payload.allTabs.map((tab) => tab.id);
      state.tabs.unsafeCurrentId = action.payload.selectedTabId;
    },

    setDataViewId: (state, action: TabAction<{ dataViewId: string | undefined }>) =>
      withTab(state, action, (tab) => {
        if (action.payload.dataViewId !== tab.dataViewId) {
          state.expandedDoc = undefined;
        }

        tab.dataViewId = action.payload.dataViewId;
      }),

    setIsDataViewLoading: (state, action: TabAction<{ isDataViewLoading: boolean }>) =>
      withTab(state, action, (tab) => {
        tab.isDataViewLoading = action.payload.isDataViewLoading;
      }),

    setDefaultProfileAdHocDataViewIds: (state, action: PayloadAction<string[]>) => {
      state.defaultProfileAdHocDataViewIds = action.payload;
    },

    setExpandedDoc: (state, action: PayloadAction<DataTableRecord | undefined>) => {
      state.expandedDoc = action.payload;
    },

    setDataRequestParams: (
      state,
      action: TabAction<{ dataRequestParams: InternalStateDataRequestParams }>
    ) =>
      withTab(state, action, (tab) => {
        tab.dataRequestParams = action.payload.dataRequestParams;
      }),

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: TabAction<{
        overriddenVisContextAfterInvalidation: TabState['overriddenVisContextAfterInvalidation'];
      }>
    ) =>
      withTab(state, action, (tab) => {
        tab.overriddenVisContextAfterInvalidation =
          action.payload.overriddenVisContextAfterInvalidation;
      }),

    setIsESQLToDataViewTransitionModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isESQLToDataViewTransitionModalVisible = action.payload;
    },

    setResetDefaultProfileState: {
      prepare: (
        payload: TabActionPayload<{
          resetDefaultProfileState: Omit<TabState['resetDefaultProfileState'], 'resetId'>;
        }>
      ) => ({
        payload: {
          ...payload,
          resetDefaultProfileState: {
            ...payload.resetDefaultProfileState,
            resetId: uuidv4(),
          },
        },
      }),
      reducer: (
        state,
        action: TabAction<{ resetDefaultProfileState: TabState['resetDefaultProfileState'] }>
      ) =>
        withTab(state, action, (tab) => {
          tab.resetDefaultProfileState = action.payload.resetDefaultProfileState;
        }),
    },

    resetOnSavedSearchChange: (state, action: TabAction) =>
      withTab(state, action, (tab) => {
        tab.overriddenVisContextAfterInvalidation = undefined;
        state.expandedDoc = undefined;
      }),
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataViewList.fulfilled, (state, action) => {
      state.savedDataViews = action.payload;
    });
  },
});

export interface InternalStateThunkDependencies {
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
  runtimeStateManager: RuntimeStateManager;
  urlStateStorage: IKbnUrlStateStorage;
}

const IS_JEST_ENVIRONMENT = typeof jest !== 'undefined';

export const createInternalStateStore = (options: InternalStateThunkDependencies) => {
  const store = configureStore({
    reducer: internalStateSlice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: options },
        serializableCheck: !IS_JEST_ENVIRONMENT,
      }),
  });

  // TEMPORARY: Create initial default tab
  const defaultTab: TabState = {
    ...defaultTabState,
    ...createTabItem(selectAllTabs(store.getState())),
  };
  store.dispatch(setTabs({ allTabs: [defaultTab], selectedTabId: defaultTab.id }));

  return store;
};

export type InternalStateStore = ReturnType<typeof createInternalStateStore>;

export type InternalStateDispatch = InternalStateStore['dispatch'];

type InternalStateThunkAction<TReturn = void> = ThunkAction<
  TReturn,
  InternalStateDispatch extends ThunkDispatch<infer TState, never, never> ? TState : never,
  InternalStateDispatch extends ThunkDispatch<never, infer TExtra, never> ? TExtra : never,
  InternalStateDispatch extends ThunkDispatch<never, never, infer TAction> ? TAction : never
>;

export type InternalStateThunkActionCreator<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => InternalStateThunkAction<TReturn>;
