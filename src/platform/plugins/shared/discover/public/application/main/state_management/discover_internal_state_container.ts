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
import { differenceBy } from 'lodash';

interface InternalStateDataRequestParams {
  timeRangeAbsolute?: TimeRange;
  timeRangeRelative?: TimeRange;
}

export interface InternalState {
  dataView: DataView | undefined;
  isDataViewLoading: boolean;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
  defaultProfileAdHocDataViewIds: string[];
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
  setDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  setIsDataViewLoading: (state: InternalState) => (isLoading: boolean) => InternalState;
  setSavedDataViews: (state: InternalState) => (dataView: DataViewListItem[]) => InternalState;
  setAdHocDataViews: (state: InternalState) => (dataViews: DataView[]) => InternalState;
  setDefaultProfileAdHocDataViews: (
    state: InternalState
  ) => (dataViews: DataView[]) => InternalState;
  appendAdHocDataViews: (
    state: InternalState
  ) => (dataViews: DataView | DataView[]) => InternalState;
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
      dataView: undefined,
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
    },
    {
      setDataView: (prevState: InternalState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
        expandedDoc:
          nextDataView?.id !== prevState.dataView?.id ? undefined : prevState.expandedDoc,
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
      setDefaultProfileAdHocDataViews:
        (prevState: InternalState) => (defaultProfileAdHocDataViews: DataView[]) => {
          const adHocDataViews = prevState.adHocDataViews
            .filter((dataView) => !prevState.defaultProfileAdHocDataViewIds.includes(dataView.id!))
            .concat(defaultProfileAdHocDataViews);

          const defaultProfileAdHocDataViewIds = defaultProfileAdHocDataViews.map(
            (dataView) => dataView.id!
          );

          return {
            ...prevState,
            adHocDataViews,
            defaultProfileAdHocDataViewIds,
          };
        },
      appendAdHocDataViews:
        (prevState: InternalState) => (dataViewsAdHoc: DataView | DataView[]) => {
          const newDataViews = Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc];
          const existingDataViews = differenceBy(prevState.adHocDataViews, newDataViews, 'id');

          return {
            ...prevState,
            adHocDataViews: existingDataViews.concat(newDataViews),
          };
        },
      replaceAdHocDataViewWithId:
        (prevState: InternalState) => (prevId: string, newDataView: DataView) => {
          let defaultProfileAdHocDataViewIds = prevState.defaultProfileAdHocDataViewIds;

          if (defaultProfileAdHocDataViewIds.includes(prevId)) {
            defaultProfileAdHocDataViewIds = defaultProfileAdHocDataViewIds.map((id) =>
              id === prevId ? newDataView.id! : id
            );
          }

          return {
            ...prevState,
            adHocDataViews: prevState.adHocDataViews.map((dataView) =>
              dataView.id === prevId ? newDataView : dataView
            ),
            defaultProfileAdHocDataViewIds,
          };
        },
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

export const selectDataViewsForPicker = ({
  savedDataViews,
  adHocDataViews: originalAdHocDataViews,
  defaultProfileAdHocDataViewIds,
}: InternalState) => {
  const managedDataViews = originalAdHocDataViews.filter(
    ({ id }) => id && defaultProfileAdHocDataViewIds.includes(id)
  );
  const adHocDataViews = differenceBy(originalAdHocDataViews, managedDataViews, 'id');

  return { savedDataViews, managedDataViews, adHocDataViews };
};
