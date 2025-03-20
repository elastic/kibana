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
import { v4 as uuid } from 'uuid';
import { i18n } from '@kbn/i18n';
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
import { selectAllTabs, selectCurrentTab } from './selectors';

const DEFAULT_TAB_LABEL = i18n.translate('discover.defaultTabLabel', {
  defaultMessage: 'Untitled session',
});
const DEFAULT_TAB_REGEX = new RegExp(`^${DEFAULT_TAB_LABEL}( \\d+)?$`);

const defaultTabState: Omit<TabState, 'id' | 'label'> = {
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
  tabs: { byId: {}, allIds: [], currentId: '' },
};

export const createTab = (allTabs: TabState[]): TabState => {
  const id = uuid();
  const untitledTabCount = allTabs.filter((tab) => DEFAULT_TAB_REGEX.test(tab.label.trim())).length;
  const label =
    untitledTabCount > 0 ? `${DEFAULT_TAB_LABEL} ${untitledTabCount}` : DEFAULT_TAB_LABEL;

  return { ...defaultTabState, id, label };
};

const withCurrentTab = (state: DiscoverInternalState, fn: (tab: TabState) => void) => {
  const currentTab = selectCurrentTab(state);

  if (currentTab) {
    fn(currentTab);
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
      state.tabs.currentId = action.payload.selectedTabId;
    },

    setDataViewId: (state, action: PayloadAction<string | undefined>) =>
      withCurrentTab(state, (tab) => {
        if (action.payload !== tab.dataViewId) {
          state.expandedDoc = undefined;
        }

        tab.dataViewId = action.payload;
      }),

    setIsDataViewLoading: (state, action: PayloadAction<boolean>) =>
      withCurrentTab(state, (tab) => {
        tab.isDataViewLoading = action.payload;
      }),

    setDefaultProfileAdHocDataViewIds: (state, action: PayloadAction<string[]>) => {
      state.defaultProfileAdHocDataViewIds = action.payload;
    },

    setExpandedDoc: (state, action: PayloadAction<DataTableRecord | undefined>) => {
      state.expandedDoc = action.payload;
    },

    setDataRequestParams: (state, action: PayloadAction<InternalStateDataRequestParams>) =>
      withCurrentTab(state, (tab) => {
        tab.dataRequestParams = action.payload;
      }),

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: PayloadAction<TabState['overriddenVisContextAfterInvalidation']>
    ) =>
      withCurrentTab(state, (tab) => {
        tab.overriddenVisContextAfterInvalidation = action.payload;
      }),

    setIsESQLToDataViewTransitionModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isESQLToDataViewTransitionModalVisible = action.payload;
    },

    setResetDefaultProfileState: {
      prepare: (
        resetDefaultProfileState: Omit<TabState['resetDefaultProfileState'], 'resetId'>
      ) => ({
        payload: {
          ...resetDefaultProfileState,
          resetId: uuidv4(),
        },
      }),
      reducer: (state, action: PayloadAction<TabState['resetDefaultProfileState']>) =>
        withCurrentTab(state, (tab) => {
          tab.resetDefaultProfileState = action.payload;
        }),
    },

    resetOnSavedSearchChange: (state) => {
      withCurrentTab(state, (tab) => {
        tab.overriddenVisContextAfterInvalidation = undefined;
      });

      state.expandedDoc = undefined;
    },
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

export const createInternalStateStore = (options: InternalStateThunkDependencies) => {
  const store = configureStore({
    reducer: internalStateSlice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: options } }),
  });

  // TEMPORARY: Create initial default tab
  const defaultTab = createTab(selectAllTabs(store.getState()));
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
