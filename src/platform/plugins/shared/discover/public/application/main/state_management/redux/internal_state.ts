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
import { throttle } from 'lodash';
import {
  type PayloadAction,
  configureStore,
  createSlice,
  type ThunkAction,
  type ThunkDispatch,
  type AnyAction,
  type Dispatch,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { TabItem } from '@kbn/unified-tabs';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import { type RuntimeStateManager, selectTabRuntimeAppState } from './runtime_state';
import {
  LoadingStatus,
  type DiscoverInternalState,
  type InternalStateDataRequestParams,
  type TabState,
  type RecentlyClosedTabState,
} from './types';
import { loadDataViewList } from './actions/data_views';
import { selectTab } from './selectors';
import type { TabsStorageManager } from '../tabs_storage_manager';
import type { DiscoverAppState } from '../discover_app_state_container';

const MIDDLEWARE_THROTTLE_MS = 300;
const MIDDLEWARE_THROTTLE_OPTIONS = { leading: false, trailing: true };

export const defaultTabState: Omit<TabState, keyof TabItem> = {
  lastPersistedGlobalState: {},
  dataViewId: undefined,
  isDataViewLoading: false,
  dataRequestParams: {
    timeRangeAbsolute: undefined,
    timeRangeRelative: undefined,
    searchSessionId: undefined,
  },
  overriddenVisContextAfterInvalidation: undefined,
  resetDefaultProfileState: {
    resetId: '',
    columns: false,
    rowHeight: false,
    breakdownField: false,
    hideChart: false,
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
  uiState: {},
};

const initialState: DiscoverInternalState = {
  initializationState: { hasESData: false, hasUserDataView: false },
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  isESQLToDataViewTransitionModalVisible: false,
  tabs: { byId: {}, allIds: [], unsafeCurrentId: '', recentlyClosedTabIds: [] },
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

    setTabs: (
      state,
      action: PayloadAction<{
        allTabs: TabState[];
        selectedTabId: string;
        recentlyClosedTabs: RecentlyClosedTabState[];
      }>
    ) => {
      state.tabs.byId = [...action.payload.recentlyClosedTabs, ...action.payload.allTabs].reduce<
        Record<string, TabState | RecentlyClosedTabState>
      >(
        (acc, tab) => ({
          ...acc,
          [tab.id]: tab,
        }),
        {}
      );
      state.tabs.allIds = action.payload.allTabs.map((tab) => tab.id);
      state.tabs.unsafeCurrentId = action.payload.selectedTabId;
      state.tabs.recentlyClosedTabIds = action.payload.recentlyClosedTabs.map((tab) => tab.id);
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

    setExpandedDoc: (
      state,
      action: PayloadAction<{
        expandedDoc: DataTableRecord | undefined;
        initialDocViewerTabId?: string;
      }>
    ) => {
      state.expandedDoc = action.payload.expandedDoc;
      state.initialDocViewerTabId = action.payload.initialDocViewerTabId;
    },

    setDataRequestParams: (
      state,
      action: TabAction<{ dataRequestParams: InternalStateDataRequestParams }>
    ) =>
      withTab(state, action, (tab) => {
        tab.dataRequestParams = action.payload.dataRequestParams;
      }),

    setTabAppStateAndGlobalState: (
      state,
      action: TabAction<{
        appState: DiscoverAppState | undefined;
        globalState: TabState['lastPersistedGlobalState'] | undefined;
      }>
    ) =>
      withTab(state, action, (tab) => {
        tab.lastPersistedGlobalState = action.payload.globalState || {};
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

    setESQLEditorUiState: (
      state,
      action: TabAction<{ esqlEditorUiState: Partial<TabState['uiState']['esqlEditor']> }>
    ) =>
      withTab(state, action, (tab) => {
        tab.uiState.esqlEditor = action.payload.esqlEditorUiState;
      }),

    setDataGridUiState: (
      state,
      action: TabAction<{ dataGridUiState: Partial<TabState['uiState']['dataGrid']> }>
    ) =>
      withTab(state, action, (tab) => {
        tab.uiState.dataGrid = action.payload.dataGridUiState;
      }),

    setFieldListUiState: (
      state,
      action: TabAction<{ fieldListUiState: Partial<TabState['uiState']['fieldList']> }>
    ) =>
      withTab(state, action, (tab) => {
        tab.uiState.fieldList = action.payload.fieldListUiState;
      }),

    setLayoutUiState: (
      state,
      action: TabAction<{ layoutUiState: Partial<TabState['uiState']['layout']> }>
    ) =>
      withTab(state, action, (tab) => {
        tab.uiState.layout = action.payload.layoutUiState;
      }),
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataViewList.fulfilled, (state, action) => {
      state.savedDataViews = action.payload;
    });
  },
});

const createMiddleware = ({
  tabsStorageManager,
  runtimeStateManager,
}: {
  tabsStorageManager: TabsStorageManager;
  runtimeStateManager: RuntimeStateManager;
}) => {
  const listenerMiddleware = createListenerMiddleware();

  listenerMiddleware.startListening({
    actionCreator: internalStateSlice.actions.setTabs,
    effect: throttle(
      (action) => {
        const getTabAppState = (tabId: string) =>
          selectTabRuntimeAppState(runtimeStateManager, tabId);
        void tabsStorageManager.persistLocally(action.payload, getTabAppState);
      },
      MIDDLEWARE_THROTTLE_MS,
      MIDDLEWARE_THROTTLE_OPTIONS
    ),
  });

  listenerMiddleware.startListening({
    actionCreator: internalStateSlice.actions.setTabAppStateAndGlobalState,
    effect: throttle(
      (action) => {
        tabsStorageManager.updateTabStateLocally(action.payload.tabId, action.payload);
      },
      MIDDLEWARE_THROTTLE_MS,
      MIDDLEWARE_THROTTLE_OPTIONS
    ),
  });

  return listenerMiddleware;
};

export interface InternalStateDependencies {
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
  runtimeStateManager: RuntimeStateManager;
  urlStateStorage: IKbnUrlStateStorage;
  tabsStorageManager: TabsStorageManager;
}

const IS_JEST_ENVIRONMENT = typeof jest !== 'undefined';

export const createInternalStateStore = (options: InternalStateDependencies) => {
  return configureStore({
    reducer: internalStateSlice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: { extraArgument: options },
        serializableCheck: !IS_JEST_ENVIRONMENT,
      }).prepend(createMiddleware(options).middleware),
    devTools: {
      name: 'DiscoverInternalState',
    },
  });
};

export type InternalStateStore = ReturnType<typeof createInternalStateStore>;

export type InternalStateDispatch = ThunkDispatch<
  DiscoverInternalState,
  InternalStateDependencies,
  AnyAction
> &
  Dispatch<AnyAction>;

type InternalStateThunkAction<TReturn = void> = ThunkAction<
  TReturn,
  InternalStateDispatch extends ThunkDispatch<infer TState, never, never> ? TState : never,
  InternalStateDispatch extends ThunkDispatch<never, infer TExtra, never> ? TExtra : never,
  InternalStateDispatch extends ThunkDispatch<never, never, infer TAction> ? TAction : never
>;

export type InternalStateThunkActionCreator<TArgs extends unknown[] = [], TReturn = void> = (
  ...args: TArgs
) => InternalStateThunkAction<TReturn>;
