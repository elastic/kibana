/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import {
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataMainMsg, DataTotalHitsMsg } from './discover_data_state_container';
import type { DataDocumentsMsg, DiscoverAppState } from '../../..';

interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

export interface InternalState {
  appState: DiscoverAppState | undefined;
  dataView: DataView | undefined;
  dataMain: DataMainMsg | undefined;
  dataResults: DataDocumentsMsg | undefined;
  dataTotalHits: DataTotalHitsMsg | undefined;
  discoverSessionInitial: SavedSearch | undefined;
  discoverSessionEdited: SavedSearch | undefined;
  discoverSessionHasChanged: boolean;
  isDataViewLoading: boolean;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
  expandedDoc: DataTableRecord | undefined;
  customFilters: Filter[];
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

export interface InternalStateTransitions {
  setAppState: (state: InternalState) => (appState: DiscoverAppState) => InternalState;
  setDataMain: (state: InternalState) => (value: DataMainMsg) => InternalState;
  setDataTotalHits: (state: InternalState) => (value: DataTotalHitsMsg) => InternalState;
  setDataResults: (state: InternalState) => (value: DataDocumentsMsg) => InternalState;
  setDiscoverSessionInitial: (state: InternalState) => (value: SavedSearch) => InternalState;
  setDiscoverSessionEdited: (state: InternalState) => (value: SavedSearch) => InternalState;
  setDiscoverSessionHasChanged: (state: InternalState) => (value: boolean) => InternalState;
  setDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  setIsDataViewLoading: (state: InternalState) => (isLoading: boolean) => InternalState;
  setSavedDataViews: (state: InternalState) => (dataView: DataViewListItem[]) => InternalState;
  setAdHocDataViews: (state: InternalState) => (dataViews: DataView[]) => InternalState;
  appendAdHocDataViews: (
    state: InternalState
  ) => (dataViews: DataView | DataView[]) => InternalState;
  removeAdHocDataViewById: (state: InternalState) => (id: string) => InternalState;
  replaceAdHocDataViewWithId: (
    state: InternalState
  ) => (id: string, dataView: DataView) => InternalState;
  setExpandedDoc: (
    state: InternalState
  ) => (dataView: DataTableRecord | undefined) => InternalState;
  setCustomFilters: (state: InternalState) => (customFilters: Filter[]) => InternalState;
  setOverriddenVisContextAfterInvalidation: (
    state: InternalState
  ) => (
    overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined
  ) => InternalState;
  resetOnSavedSearchChange: (state: InternalState) => () => InternalState;
  setIsESQLToDataViewTransitionModalVisible: (
    state: InternalState
  ) => (isVisible: boolean) => InternalState;
  setResetDefaultProfileState: (
    state: InternalState
  ) => (
    resetDefaultProfileState: Omit<InternalState['resetDefaultProfileState'], 'resetId'>
  ) => InternalState;
  setDataRequestParams: (
    state: InternalState
  ) => (params: InternalStateDataRequestParams) => InternalState;
}

export type DiscoverInternalStateContainer = ReduxLikeStateContainer<
  InternalState,
  InternalStateTransitions
>;

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<InternalState>>();

export function getInternalStateContainer() {
  return createStateContainer<InternalState, InternalStateTransitions, {}>(
    {
      appState: undefined,
      dataView: undefined,
      dataMain: undefined,
      dataResults: undefined,
      dataTotalHits: undefined,
      discoverSessionInitial: undefined,
      discoverSessionEdited: undefined,
      discoverSessionHasChanged: false,
      isDataViewLoading: false,
      adHocDataViews: [],
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
    },
    {
      setAppState: (prevState: InternalState) => (nextAppState: DiscoverAppState) => ({
        ...prevState,
        appState: nextAppState,
      }),
      setDataView: (prevState: InternalState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
        expandedDoc:
          nextDataView?.id !== prevState.dataView?.id ? undefined : prevState.expandedDoc,
      }),
      setDataMain: (prevState: InternalState) => (next: DataMainMsg) => ({
        ...prevState,
        dataMain: next,
      }),
      setDataTotalHits: (prevState: InternalState) => (next: DataTotalHitsMsg) => ({
        ...prevState,
        dataTotalHits: next,
      }),
      setDataResults: (prevState: InternalState) => (next: DataDocumentsMsg) => ({
        ...prevState,
        dataResults: next,
      }),
      setDiscoverSessionInitial: (prevState: InternalState) => (next: SavedSearch) => ({
        ...prevState,
        discoverSessionInitial: next,
      }),
      setDiscoverSessionEdited: (prevState: InternalState) => (next: SavedSearch) => ({
        ...prevState,
        discoverSessionEdited: next,
      }),
      setDiscoverSessionHasChanged: (prevState: InternalState) => (next: boolean) => ({
        ...prevState,
        discoverSessionHasChanged: next,
      }),
      setIsDataViewLoading: (prevState: InternalState) => (loading: boolean) => ({
        ...prevState,
        isDataViewLoading: loading,
      }),
      setIsESQLToDataViewTransitionModalVisible:
        (prevState: InternalState) => (isVisible: boolean) => ({
          ...prevState,
          isESQLToDataViewTransitionModalVisible: isVisible,
        }),
      setSavedDataViews: (prevState: InternalState) => (nextDataViewList: DataViewListItem[]) => ({
        ...prevState,
        savedDataViews: nextDataViewList,
      }),
      setAdHocDataViews: (prevState: InternalState) => (newAdHocDataViewList: DataView[]) => ({
        ...prevState,
        adHocDataViews: newAdHocDataViewList,
      }),
      appendAdHocDataViews:
        (prevState: InternalState) => (dataViewsAdHoc: DataView | DataView[]) => {
          // check for already existing data views
          const concatList = (
            Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc]
          ).filter((dataView) => {
            return !prevState.adHocDataViews.find((el: DataView) => el.id === dataView.id);
          });
          if (!concatList.length) {
            return prevState;
          }
          return {
            ...prevState,
            adHocDataViews: prevState.adHocDataViews.concat(dataViewsAdHoc),
          };
        },
      removeAdHocDataViewById: (prevState: InternalState) => (id: string) => ({
        ...prevState,
        adHocDataViews: prevState.adHocDataViews.filter((dataView) => dataView.id !== id),
      }),
      replaceAdHocDataViewWithId:
        (prevState: InternalState) => (prevId: string, newDataView: DataView) => ({
          ...prevState,
          adHocDataViews: prevState.adHocDataViews.map((dataView) =>
            dataView.id === prevId ? newDataView : dataView
          ),
        }),
      setExpandedDoc: (prevState: InternalState) => (expandedDoc: DataTableRecord | undefined) => ({
        ...prevState,
        expandedDoc,
      }),
      setCustomFilters: (prevState: InternalState) => (customFilters: Filter[]) => ({
        ...prevState,
        customFilters,
      }),
      setOverriddenVisContextAfterInvalidation:
        (prevState: InternalState) =>
        (overriddenVisContextAfterInvalidation: UnifiedHistogramVisContext | {} | undefined) => ({
          ...prevState,
          overriddenVisContextAfterInvalidation,
        }),
      resetOnSavedSearchChange: (prevState: InternalState) => () => ({
        ...prevState,
        overriddenVisContextAfterInvalidation: undefined,
        expandedDoc: undefined,
      }),
      setDataRequestParams:
        (prevState: InternalState) => (params: InternalStateDataRequestParams) => ({
          ...prevState,
          dataRequestParams: params,
        }),
      setResetDefaultProfileState:
        (prevState: InternalState) =>
        (resetDefaultProfileState: Omit<InternalState['resetDefaultProfileState'], 'resetId'>) => ({
          ...prevState,
          resetDefaultProfileState: {
            ...resetDefaultProfileState,
            resetId: uuidv4(),
          },
        }),
    },
    {},
    { freeze: (state) => state }
  );
}
