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
import { throttle, isEqual } from 'lodash';
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
  current,
} from '@reduxjs/toolkit';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
import {
  type RuntimeStateManager,
  selectTabRuntimeAppState,
  selectTabRuntimeInternalState,
} from './runtime_state';
import {
  type DiscoverInternalState,
  type InternalStateDataRequestParams,
  type TabState,
  type RecentlyClosedTabState,
} from './types';
import { loadDataViewList, initializeTabs, saveDiscoverSession } from './actions';
import { selectTab } from './selectors';
import type { TabsStorageManager } from '../tabs_storage_manager';
const MIDDLEWARE_THROTTLE_MS = 300;
const MIDDLEWARE_THROTTLE_OPTIONS = { leading: false, trailing: true };

const initialState: DiscoverInternalState = {
  initializationState: { hasESData: false, hasUserDataView: false },
  userId: undefined,
  spaceId: undefined,
  persistedDiscoverSession: undefined,
  editedDiscoverSession: undefined,
  hasDiscoverSessionChanged: false,
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  isESQLToDataViewTransitionModalVisible: false,
  tabs: {
    areInitializing: false,
    byId: {},
    allIds: [],
    unsafeCurrentId: '',
    recentlyClosedTabIds: [],
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
      // in case there's a persisted discover session, check if tabs have the same labels, and if not create a updated version of the session
      // also check if the order of tabs is the same, if not, create a new session
      const discoverSessionToChange = state.editedDiscoverSession ?? state.persistedDiscoverSession;
      if (discoverSessionToChange) {
        const persistedTabs = discoverSessionToChange.tabs;
        const currentTabs = action.payload.allTabs;

        const idsOrOrderChanged = !isEqual(
          persistedTabs.map((tab) => tab.id),
          currentTabs.map((tab) => tab.id)
        );

        const labelsByIdPersisted = Object.fromEntries(
          persistedTabs.map((tab) => [tab.id, tab.label])
        );

        const labelsChanged = currentTabs.some(
          (tab) =>
            labelsByIdPersisted[tab.id] !== undefined && labelsByIdPersisted[tab.id] !== tab.label
        );

        if (idsOrOrderChanged || labelsChanged) {
          state.hasDiscoverSessionChanged = true;

          const updatedTabs: DiscoverSession['tabs'] = currentTabs.map((tab) => {
            const persistedTab = state.persistedDiscoverSession?.tabs.find((t) => t.id === tab.id);
            if (persistedTab) {
              return {
                ...persistedTab,
                id: tab.id || persistedTab.id,
                label: tab.label,
              };
            }
            // New tab not present in persisted session: provide minimal required fields
            return {
              id: tab.id,
              label: tab.label,
              sort: [] as [string, string][],
            };
          });

          const nextDiscoverSession = { ...discoverSessionToChange, tabs: updatedTabs };
          state.hasDiscoverSessionChanged = !isEqual(
            nextDiscoverSession,
            state.persistedDiscoverSession
          );
          state.editedDiscoverSession = state.hasDiscoverSessionChanged
            ? nextDiscoverSession
            : undefined;
        }
      }
    },

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

    setEditedDiscoverSession: (
      state,
      action: PayloadAction<{
        discoverSession: DiscoverSession | undefined;
      }>
    ) => {
      const persistedDiscoverSession = !state.persistedDiscoverSession
        ? undefined
        : current(state.persistedDiscoverSession);
      if (!persistedDiscoverSession) {
        state.hasDiscoverSessionChanged = true;
        state.editedDiscoverSession = action.payload.discoverSession;
      } else {
        state.hasDiscoverSessionChanged = !isEqual(
          action.payload.discoverSession,
          persistedDiscoverSession
        );
        state.editedDiscoverSession = state.hasDiscoverSessionChanged
          ? action.payload.discoverSession
          : undefined;
      }
    },

    setPersistedDiscoverSession: (
      state,
      action: PayloadAction<{
        discoverSession: DiscoverSession | undefined;
      }>
    ) => {
      state.persistedDiscoverSession = action.payload.discoverSession;
      state.hasDiscoverSessionChanged = false;
      state.editedDiscoverSession = undefined;
    },
    undoDiscoverSessionChanges: (state) => {
      if (state.persistedDiscoverSession) {
        state.editedDiscoverSession = undefined;
        state.hasDiscoverSessionChanged = false;
      }
    },
    setDataRequestParams: (
      state,
      action: TabAction<{ dataRequestParams: InternalStateDataRequestParams }>
    ) =>
      withTab(state, action, (tab) => {
        tab.dataRequestParams = action.payload.dataRequestParams;
      }),

    setGlobalState: (
      state,
      action: TabAction<{
        globalState: TabState['globalState'];
      }>
    ) =>
      withTab(state, action, (tab) => {
        tab.globalState = action.payload.globalState;
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
      state.editedDiscoverSession = undefined;
      state.hasDiscoverSessionChanged = false;
    });

    builder.addCase(saveDiscoverSession.fulfilled, (state, action) => {
      if (action.payload.discoverSession) {
        state.persistedDiscoverSession = action.payload.discoverSession;
        state.editedDiscoverSession = undefined;
        state.hasDiscoverSessionChanged = false;
      }
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

  // listens for specific actions or state changes and performs side effects accordingly. The middleware is configured with throttling to optimize performance and avoid excessive execution.

  startListening({
    actionCreator: internalStateSlice.actions.setTabs,
    effect: throttle<InternalStateListenerEffect<typeof internalStateSlice.actions.setTabs>>(
      (action, listenerApi) => {
        const { runtimeStateManager, tabsStorageManager } = listenerApi.extra;
        const getTabAppState = (tabId: string) =>
          selectTabRuntimeAppState(runtimeStateManager, tabId);
        const getTabInternalState = (tabId: string) =>
          selectTabRuntimeInternalState(runtimeStateManager, tabId);
        void tabsStorageManager.persistLocally(action.payload, getTabAppState, getTabInternalState);
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
    predicate: (_, currentState, previousState) => {
      return (
        currentState.persistedDiscoverSession?.id !== previousState.persistedDiscoverSession?.id
      );
    },
    effect: (_, listenerApi) => {
      const { tabsStorageManager } = listenerApi.extra;
      const { persistedDiscoverSession } = listenerApi.getState();
      tabsStorageManager.updateDiscoverSessionIdLocally(persistedDiscoverSession?.id);
    },
  });

  startListening({
    predicate: (action) =>
      action.type === internalStateSlice.actions.undoDiscoverSessionChanges.type,
    effect: (_, listenerApi) => {
      const { tabsStorageManager } = listenerApi.extra;
      tabsStorageManager.cleanOpenTabs();
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
