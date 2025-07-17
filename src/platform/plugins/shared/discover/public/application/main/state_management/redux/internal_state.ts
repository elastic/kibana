/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  type PayloadAction,
  configureStore,
  createSlice,
  type ThunkAction,
  type ThunkDispatch,
} from '@reduxjs/toolkit';
import type { Filter } from '@kbn/es-query';
import type { DiscoverServices } from '../../../../build_services';
import type { RuntimeStateManager } from './runtime_state';
import type { DiscoverInternalState, InternalStateDataRequestParams } from './types';

const initialState: DiscoverInternalState = {
  dataViewId: undefined,
  isDataViewLoading: false,
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  customFilters: [],
  dataRequestParams: {},
  overriddenVisContextAfterInvalidation: undefined,
  isESQLToDataViewTransitionModalVisible: false,
  resetDefaultProfileState: {
    resetId: '',
    columns: false,
    rowHeight: false,
    breakdownField: false,
    hideChart: false,
  },
};

export const internalStateSlice = createSlice({
  name: 'internalState',
  initialState,
  reducers: {
    setDataViewId: (state, action: PayloadAction<string | undefined>) => {
      if (action.payload !== state.dataViewId) {
        state.expandedDoc = undefined;
      }

      state.dataViewId = action.payload;
    },

    setIsDataViewLoading: (state, action: PayloadAction<boolean>) => {
      state.isDataViewLoading = action.payload;
    },

    setDefaultProfileAdHocDataViewIds: (state, action: PayloadAction<string[]>) => {
      state.defaultProfileAdHocDataViewIds = action.payload;
    },

    setSavedDataViews: (state, action: PayloadAction<DataViewListItem[]>) => {
      state.savedDataViews = action.payload;
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

    setCustomFilters: (state, action: PayloadAction<Filter[]>) => {
      state.customFilters = action.payload;
    },

    setDataRequestParams: (state, action: PayloadAction<InternalStateDataRequestParams>) => {
      state.dataRequestParams = action.payload;
    },

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: PayloadAction<DiscoverInternalState['overriddenVisContextAfterInvalidation']>
    ) => {
      state.overriddenVisContextAfterInvalidation = action.payload;
    },

    setIsESQLToDataViewTransitionModalVisible: (state, action: PayloadAction<boolean>) => {
      state.isESQLToDataViewTransitionModalVisible = action.payload;
    },

    setResetDefaultProfileState: {
      prepare: (
        resetDefaultProfileState: Omit<DiscoverInternalState['resetDefaultProfileState'], 'resetId'>
      ) => ({
        payload: {
          ...resetDefaultProfileState,
          resetId: uuidv4(),
        },
      }),
      reducer: (
        state,
        action: PayloadAction<DiscoverInternalState['resetDefaultProfileState']>
      ) => {
        state.resetDefaultProfileState = action.payload;
      },
    },

    resetOnSavedSearchChange: (state) => {
      state.overriddenVisContextAfterInvalidation = undefined;
      state.expandedDoc = undefined;
    },
  },
});

interface InternalStateThunkDependencies {
  services: DiscoverServices;
  runtimeStateManager: RuntimeStateManager;
}

export const createInternalStateStore = (options: InternalStateThunkDependencies) =>
  configureStore({
    reducer: internalStateSlice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: options } }),
  });

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
