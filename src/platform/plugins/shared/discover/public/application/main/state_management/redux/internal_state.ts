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
  type PayloadActionCreator,
  type ThunkAction,
  type ThunkDispatch,
  type TypedStartListening,
  type ListenerEffect,
  configureStore,
  createSlice,
  createListenerMiddleware,
  createAction,
  isAnyOf,
} from '@reduxjs/toolkit';
import { dismissFlyouts, DiscoverFlyouts } from '@kbn/discover-utils';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import {
  type RuntimeStateManager,
  selectTabRuntimeAppState,
  selectTabRuntimeInternalState,
} from './runtime_state';
import {
  TabsBarVisibility,
  type DiscoverInternalState,
  type TabState,
  type RecentlyClosedTabState,
} from './types';
import { loadDataViewList, initializeTabs } from './actions';
import { type HasUnsavedChangesResult, selectTab } from './selectors';
import type { TabsStorageManager } from '../tabs_storage_manager';

const MIDDLEWARE_THROTTLE_MS = 300;
const MIDDLEWARE_THROTTLE_OPTIONS = { leading: false, trailing: true };

const initialState: DiscoverInternalState = {
  initializationState: { hasESData: false, hasUserDataView: false },
  userId: undefined,
  spaceId: undefined,
  persistedDiscoverSession: undefined,
  hasUnsavedChanges: false,
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  isESQLToDataViewTransitionModalVisible: false,
  tabsBarVisibility: TabsBarVisibility.default,
  tabs: {
    areInitializing: false,
    byId: {},
    allIds: [],
    unsavedIds: [],
    recentlyClosedTabsById: {},
    recentlyClosedTabIds: [],
    unsafeCurrentId: '',
  },
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
        updatedDiscoverSession?: DiscoverSession;
      }>
    ) => {
      state.tabs.byId = action.payload.allTabs.reduce<Record<string, TabState>>(
        (acc, tab) => ({
          ...acc,
          [tab.id]:
            tab.id === action.payload.selectedTabId ? { ...tab, forceFetchOnSelect: false } : tab,
        }),
        {}
      );
      state.tabs.allIds = action.payload.allTabs.map((tab) => tab.id);
      state.tabs.recentlyClosedTabsById = action.payload.recentlyClosedTabs.reduce<
        Record<string, RecentlyClosedTabState>
      >(
        (acc, tab) => ({
          ...acc,
          [tab.id]: tab,
        }),
        {}
      );
      state.tabs.recentlyClosedTabIds = action.payload.recentlyClosedTabs.map((tab) => tab.id);
      state.tabs.unsafeCurrentId = action.payload.selectedTabId;
      state.persistedDiscoverSession =
        action.payload.updatedDiscoverSession ?? state.persistedDiscoverSession;
    },

    setUnsavedChanges: (state, action: PayloadAction<HasUnsavedChangesResult>) => {
      state.hasUnsavedChanges = action.payload.hasUnsavedChanges;
      state.tabs.unsavedIds = action.payload.unsavedTabIds;
    },

    setForceFetchOnSelect: (state, action: TabAction<Pick<TabState, 'forceFetchOnSelect'>>) =>
      withTab(state, action, (tab) => {
        tab.forceFetchOnSelect = action.payload.forceFetchOnSelect;
      }),

    setIsDataViewLoading: (state, action: TabAction<Pick<TabState, 'isDataViewLoading'>>) =>
      withTab(state, action, (tab) => {
        tab.isDataViewLoading = action.payload.isDataViewLoading;
      }),

    setDefaultProfileAdHocDataViewIds: (state, action: PayloadAction<string[]>) => {
      state.defaultProfileAdHocDataViewIds = action.payload;
    },

    setTabsBarVisibility: (state, action: PayloadAction<TabsBarVisibility>) => {
      state.tabsBarVisibility = action.payload;
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

    discardFlyoutsOnTabChange: (state) => {
      state.expandedDoc = undefined;
      state.initialDocViewerTabId = undefined;
    },

    setDataRequestParams: (state, action: TabAction<Pick<TabState, 'dataRequestParams'>>) =>
      withTab(state, action, (tab) => {
        tab.dataRequestParams = action.payload.dataRequestParams;
      }),

    setGlobalState: (state, action: TabAction<Pick<TabState, 'globalState'>>) =>
      withTab(state, action, (tab) => {
        tab.globalState = action.payload.globalState;
      }),

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: TabAction<Pick<TabState, 'overriddenVisContextAfterInvalidation'>>
    ) =>
      withTab(state, action, (tab) => {
        tab.overriddenVisContextAfterInvalidation =
          action.payload.overriddenVisContextAfterInvalidation;
      }),

    setControlGroupState: (
      state,
      action: TabAction<{
        controlGroupState: TabState['controlGroupState'];
      }>
    ) =>
      withTab(state, action, (tab) => {
        tab.controlGroupState = action.payload.controlGroupState;
      }),

    setEsqlVariables: (
      state,
      action: TabAction<{ esqlVariables: ESQLControlVariable[] | undefined }>
    ) =>
      withTab(state, action, (tab) => {
        tab.esqlVariables = action.payload.esqlVariables;
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
      reducer: (state, action: TabAction<Pick<TabState, 'resetDefaultProfileState'>>) =>
        withTab(state, action, (tab) => {
          tab.resetDefaultProfileState = action.payload.resetDefaultProfileState;
        }),
    },

    resetOnSavedSearchChange: (state, action: TabAction) =>
      withTab(state, action, (tab) => {
        tab.overriddenVisContextAfterInvalidation = undefined;
        state.expandedDoc = undefined;
        state.initialDocViewerTabId = undefined;
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

    setSearchDraftUiState: (
      state,
      action: TabAction<{ searchDraftUiState: Partial<TabState['uiState']['searchDraft']> }>
    ) =>
      withTab(state, action, (tab) => {
        tab.uiState.searchDraft = action.payload.searchDraftUiState;
      }),
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataViewList.fulfilled, (state, action) => {
      state.savedDataViews = action.payload;
    });

    builder.addCase(initializeTabs.pending, (state) => {
      state.tabs.areInitializing = true;
    });

    builder.addCase(initializeTabs.fulfilled, (state, action) => {
      state.userId = action.payload.userId;
      state.spaceId = action.payload.spaceId;
      state.persistedDiscoverSession = action.payload.persistedDiscoverSession;
    });

    builder.addMatcher(isAnyOf(initializeTabs.fulfilled, initializeTabs.rejected), (state) => {
      state.tabs.areInitializing = false;
    });
  },
});

export const syncLocallyPersistedTabState = createAction<TabActionPayload>(
  'internalState/syncLocallyPersistedTabState'
);

type InternalStateListenerEffect<
  TActionCreator extends PayloadActionCreator<TPayload>,
  TPayload = TActionCreator extends PayloadActionCreator<infer T> ? T : never
> = ListenerEffect<
  ReturnType<TActionCreator>,
  DiscoverInternalState,
  InternalStateDispatch,
  InternalStateDependencies
>;

const createMiddleware = (options: InternalStateDependencies) => {
  const listenerMiddleware = createListenerMiddleware({ extra: options });
  const startListening = listenerMiddleware.startListening as TypedStartListening<
    DiscoverInternalState,
    InternalStateDispatch,
    InternalStateDependencies
  >;

  startListening({
    actionCreator: internalStateSlice.actions.setTabs,
    effect: throttle<InternalStateListenerEffect<typeof internalStateSlice.actions.setTabs>>(
      (action, listenerApi) => {
        const discoverSession =
          action.payload.updatedDiscoverSession ?? listenerApi.getState().persistedDiscoverSession;
        const { runtimeStateManager, tabsStorageManager } = listenerApi.extra;
        const getTabAppState = (tabId: string) =>
          selectTabRuntimeAppState(runtimeStateManager, tabId);
        const getTabInternalState = (tabId: string) =>
          selectTabRuntimeInternalState(runtimeStateManager, tabId);
        void tabsStorageManager.persistLocally(
          action.payload,
          getTabAppState,
          getTabInternalState,
          discoverSession?.id
        );
      },
      MIDDLEWARE_THROTTLE_MS,
      MIDDLEWARE_THROTTLE_OPTIONS
    ),
  });

  startListening({
    actionCreator: syncLocallyPersistedTabState,
    effect: throttle<InternalStateListenerEffect<typeof syncLocallyPersistedTabState>>(
      (action, listenerApi) => {
        const { runtimeStateManager, tabsStorageManager } = listenerApi.extra;
        withTab(listenerApi.getState(), action, (tab) => {
          tabsStorageManager.updateTabStateLocally(action.payload.tabId, {
            internalState: selectTabRuntimeInternalState(runtimeStateManager, tab.id),
            appState: selectTabRuntimeAppState(runtimeStateManager, tab.id),
            globalState: tab.globalState,
          });
        });
      },
      MIDDLEWARE_THROTTLE_MS,
      MIDDLEWARE_THROTTLE_OPTIONS
    ),
  });

  startListening({
    actionCreator: internalStateSlice.actions.discardFlyoutsOnTabChange,
    effect: () => {
      dismissFlyouts([DiscoverFlyouts.lensEdit, DiscoverFlyouts.metricInsights]);
    },
  });

  return listenerMiddleware.middleware;
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
      }).prepend(createMiddleware(options)),
    devTools: {
      name: 'DiscoverInternalState',
    },
  });
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
