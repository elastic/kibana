/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { TimeRange } from '@kbn/es-query';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import {
  type PayloadAction,
  configureStore,
  createSlice,
  type ThunkAction,
  type ThunkDispatch,
} from '@reduxjs/toolkit';
import { differenceBy, omit } from 'lodash';
import {
  type TypedUseSelectorHook,
  type ReactReduxContextValue,
  Provider as ReduxProvider,
  createDispatchHook,
  createSelectorHook,
} from 'react-redux';
import React, { type PropsWithChildren, useMemo, createContext } from 'react';
import type { DiscoverServices } from '../../../../build_services';
import { useAdHocDataViews, type RuntimeStateManager } from './runtime_state';

export interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

export interface DiscoverInternalState {
  dataViewId: string | undefined;
  isDataViewLoading: boolean;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataViewSpec[];
  defaultProfileAdHocDataViewIds: string[];
  expandedDoc: DataTableRecord | undefined;
  overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined; // it will be used during saved search saving
  isESQLToDataViewTransitionModalVisible?: boolean;
  resetDefaultProfileState: {
    resetId: string;
    columns: boolean;
    rowHeight: boolean;
    breakdownField: boolean;
  };
  dataRequestParams: InternalStateDataRequestParams;
}

const initialState: DiscoverInternalState = {
  dataViewId: undefined,
  isDataViewLoading: false,
  adHocDataViews: [],
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  overriddenVisContextAfterInvalidation: undefined,
  resetDefaultProfileState: {
    resetId: '',
    columns: false,
    rowHeight: false,
    breakdownField: false,
  },
  dataRequestParams: {},
};

const internalStateSlice = createSlice({
  name: 'internalState',
  initialState,
  reducers: {
    setDataViewId: (state, action: PayloadAction<{ dataViewId: string | undefined }>) => {
      if (action.payload.dataViewId !== state.dataViewId) {
        state.expandedDoc = undefined;
      }

      state.dataViewId = action.payload.dataViewId;
    },

    setIsDataViewLoading: (state, action: PayloadAction<{ isDataViewLoading: boolean }>) => {
      state.isDataViewLoading = action.payload.isDataViewLoading;
    },

    setIsESQLToDataViewTransitionModalVisible: (
      state,
      action: PayloadAction<{ isVisible: boolean }>
    ) => {
      state.isESQLToDataViewTransitionModalVisible = action.payload.isVisible;
    },

    setSavedDataViews: (state, action: PayloadAction<{ savedDataViews: DataViewListItem[] }>) => {
      state.savedDataViews = action.payload.savedDataViews;
    },

    setAdHocDataViews: (state, action: PayloadAction<{ adHocDataViews: DataViewSpec[] }>) => {
      state.adHocDataViews = action.payload.adHocDataViews;
    },

    setDefaultProfileAdHocDataViewIds: (
      state,
      action: PayloadAction<{ defaultProfileAdHocDataViewIds: string[] }>
    ) => {
      state.defaultProfileAdHocDataViewIds = action.payload.defaultProfileAdHocDataViewIds;
    },

    setExpandedDoc: (
      state,
      action: PayloadAction<{ expandedDoc: DataTableRecord | undefined }>
    ) => {
      state.expandedDoc = action.payload.expandedDoc;
    },

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: PayloadAction<{
        overriddenVisContextAfterInvalidation: DiscoverInternalState['overriddenVisContextAfterInvalidation'];
      }>
    ) => {
      state.overriddenVisContextAfterInvalidation =
        action.payload.overriddenVisContextAfterInvalidation;
    },

    resetOnSavedSearchChange: (state) => {
      state.overriddenVisContextAfterInvalidation = undefined;
      state.expandedDoc = undefined;
    },

    setDataRequestParams: (
      state,
      action: PayloadAction<{ dataRequestParams: InternalStateDataRequestParams }>
    ) => {
      state.dataRequestParams = action.payload.dataRequestParams;
    },

    setResetDefaultProfileState: (
      state,
      action: PayloadAction<Omit<DiscoverInternalState['resetDefaultProfileState'], 'resetId'>>
    ) => {
      state.resetDefaultProfileState = {
        ...action.payload,
        resetId: uuidv4(),
      };
    },
  },
});

export interface InternalStateThunkDependencies {
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

export type InternalStateThunk<TReturn = void> = ThunkAction<
  TReturn,
  InternalStateDispatch extends ThunkDispatch<infer TState, never, never> ? TState : never,
  InternalStateDispatch extends ThunkDispatch<never, infer TExtra, never> ? TExtra : never,
  InternalStateDispatch extends ThunkDispatch<never, never, infer TAction> ? TAction : never
>;

const setDataView =
  (dataView: DataView): InternalStateThunk =>
  (dispatch, _, { runtimeStateManager }) => {
    dispatch(internalStateSlice.actions.setDataViewId({ dataViewId: dataView.id }));
    runtimeStateManager.currentDataView$.next(dataView);
  };

const setAdHocDataViews =
  (adHocDataViews: DataView[]): InternalStateThunk =>
  (dispatch, _, { runtimeStateManager }) => {
    dispatch(
      internalStateSlice.actions.setAdHocDataViews({
        adHocDataViews: adHocDataViews.map((dataView) => dataView.toSpec(false)),
      })
    );
    runtimeStateManager.adHocDataViews$.next(adHocDataViews);
  };

const setDefaultProfileAdHocDataViews =
  (defaultProfileAdHocDataViews: DataView[]): InternalStateThunk =>
  (dispatch, getState, { runtimeStateManager }) => {
    const prevAdHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
    const prevState = getState();

    const adHocDataViews = prevAdHocDataViews
      .filter((dataView) => !prevState.defaultProfileAdHocDataViewIds.includes(dataView.id!))
      .concat(defaultProfileAdHocDataViews);

    const defaultProfileAdHocDataViewIds = defaultProfileAdHocDataViews.map(
      (dataView) => dataView.id!
    );

    dispatch(setAdHocDataViews(adHocDataViews));
    dispatch(
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds({
        defaultProfileAdHocDataViewIds,
      })
    );
  };

const appendAdHocDataViews =
  (dataViewsAdHoc: DataView | DataView[]): InternalStateThunk =>
  (dispatch, _, { runtimeStateManager }) => {
    const prevAdHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
    const newDataViews = Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc];
    const existingDataViews = differenceBy(prevAdHocDataViews, newDataViews, 'id');

    dispatch(setAdHocDataViews(existingDataViews.concat(newDataViews)));
  };

const replaceAdHocDataViewWithId =
  (prevId: string, newDataView: DataView): InternalStateThunk =>
  (dispatch, getState, { runtimeStateManager }) => {
    const prevAdHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
    let defaultProfileAdHocDataViewIds = getState().defaultProfileAdHocDataViewIds;

    if (defaultProfileAdHocDataViewIds.includes(prevId)) {
      defaultProfileAdHocDataViewIds = defaultProfileAdHocDataViewIds.map((id) =>
        id === prevId ? newDataView.id! : id
      );
    }

    dispatch(
      setAdHocDataViews(
        prevAdHocDataViews.map((dataView) => (dataView.id === prevId ? newDataView : dataView))
      )
    );
    dispatch(
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds({
        defaultProfileAdHocDataViewIds,
      })
    );
  };

export const internalStateActions = {
  ...omit(internalStateSlice.actions, 'setDataViewId', 'setDefaultProfileAdHocDataViewIds'),
  setDataView,
  setAdHocDataViews,
  setDefaultProfileAdHocDataViews,
  appendAdHocDataViews,
  replaceAdHocDataViewWithId,
};

const internalStateContext = createContext<ReactReduxContextValue>(
  // Recommended approach for versions of Redux prior to v9:
  // https://github.com/reduxjs/react-redux/issues/1565#issuecomment-867143221
  null as unknown as ReactReduxContextValue
);

export const InternalStateProvider = ({
  store,
  children,
}: PropsWithChildren<{ store: InternalStateStore }>) => (
  <ReduxProvider store={store} context={internalStateContext}>
    {children}
  </ReduxProvider>
);

export const useInternalStateDispatch: () => InternalStateDispatch =
  createDispatchHook(internalStateContext);

export const useInternalStateSelector: TypedUseSelectorHook<DiscoverInternalState> =
  createSelectorHook(internalStateContext);

export const useDataViewsForPicker = () => {
  const originalAdHocDataViews = useAdHocDataViews();
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);
  const defaultProfileAdHocDataViewIds = useInternalStateSelector(
    (state) => state.defaultProfileAdHocDataViewIds
  );

  return useMemo(() => {
    const managedDataViews = originalAdHocDataViews.filter(
      ({ id }) => id && defaultProfileAdHocDataViewIds.includes(id)
    );
    const adHocDataViews = differenceBy(originalAdHocDataViews, managedDataViews, 'id');

    return { savedDataViews, managedDataViews, adHocDataViews };
  }, [defaultProfileAdHocDataViewIds, originalAdHocDataViews, savedDataViews]);
};
