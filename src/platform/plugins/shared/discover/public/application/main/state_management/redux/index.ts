/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { type PayloadAction, configureStore, createSlice } from '@reduxjs/toolkit';
import type { DataView, DataViewListItem } from '@kbn/data-plugin/common';
import { differenceBy, omit } from 'lodash';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';
import type { Subject } from 'rxjs';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverInternalState, InternalStateDataRequestParams } from './types';

const initialState: DiscoverInternalState = {
  dataViewId: undefined,
  isDataViewLoading: false,
  adHocDataViews: [],
  defaultProfileAdHocDataViewIds: [],
  savedDataViews: [],
  expandedDoc: undefined,
  customFilters: [],
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

    setAdHocDataViews: (state, action: PayloadAction<{ adHocDataViews: DataViewListItem[] }>) => {
      state.adHocDataViews = action.payload.adHocDataViews;
    },

    setDefaultProfileAdHocDataViews: (
      state,
      action: PayloadAction<{ defaultProfileAdHocDataViews: DataViewListItem[] }>
    ) => {
      const { defaultProfileAdHocDataViews } = action.payload;

      state.adHocDataViews = state.adHocDataViews
        .filter((dataView) => !state.defaultProfileAdHocDataViewIds.includes(dataView.id))
        .concat(defaultProfileAdHocDataViews);

      state.defaultProfileAdHocDataViewIds = defaultProfileAdHocDataViews.map(
        (dataView) => dataView.id
      );
    },

    appendAdHocDataViews: (
      state,
      action: PayloadAction<{ adHocDataViews: DataViewListItem[] }>
    ) => {
      const { adHocDataViews } = action.payload;
      const newDataViews = Array.isArray(adHocDataViews) ? adHocDataViews : [adHocDataViews];
      const existingDataViews = differenceBy(state.adHocDataViews, newDataViews, 'id');

      state.adHocDataViews = existingDataViews.concat(newDataViews);
    },

    replaceAdHocDataViewWithId: (
      state,
      action: PayloadAction<{ prevId: string; newDataView: DataViewListItem }>
    ) => {
      const { prevId, newDataView } = action.payload;

      state.defaultProfileAdHocDataViewIds = state.defaultProfileAdHocDataViewIds.map((id) =>
        id === prevId ? newDataView.id : id
      );

      state.adHocDataViews = state.adHocDataViews.map((dataView) =>
        dataView.id === prevId ? newDataView : dataView
      );
    },

    setExpandedDoc: (
      state,
      action: PayloadAction<{ expandedDoc: DataTableRecord | undefined }>
    ) => {
      state.expandedDoc = action.payload.expandedDoc;
    },

    setCustomFilters: (state, action: PayloadAction<{ customFilters: Filter[] }>) => {
      state.customFilters = action.payload.customFilters;
    },

    setOverriddenVisContextAfterInvalidation: (
      state,
      action: PayloadAction<{ overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext }>
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

interface InternalStateThunkDependencies {
  services: DiscoverServices;
  currentDataView$: Subject<DataView | undefined>;
}

export const createInternalStateStore = (options: InternalStateThunkDependencies) =>
  configureStore({
    reducer: internalStateSlice.reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: options } }),
  });

type InternalStateStore = ReturnType<typeof createInternalStateStore>;
type InternalStateDispatch = InternalStateStore['dispatch'];
type InternalStateGetState = InternalStateStore['getState'];

const setDataView =
  (dataView: DataView) =>
  (
    dispatch: InternalStateDispatch,
    _: InternalStateGetState,
    { currentDataView$ }: InternalStateThunkDependencies
  ) => {
    dispatch(internalStateSlice.actions.setDataViewId({ dataViewId: dataView.id }));
    currentDataView$.next(dataView);
  };

export const internalStateActions = {
  ...omit(internalStateSlice.actions, 'setDataViewId'),
  setDataView,
};
