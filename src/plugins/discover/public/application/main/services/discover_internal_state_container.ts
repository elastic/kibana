/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import { DataViewLazy, DataViewListItem } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';

export interface InternalState {
  dataView: DataViewLazy | undefined;
  isDataViewLoading: boolean;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataViewLazy[];
  expandedDoc: DataTableRecord | undefined;
  customFilters: Filter[];
}

export interface InternalStateTransitions {
  setDataView: (state: InternalState) => (dataView: DataViewLazy) => InternalState;
  setIsDataViewLoading: (state: InternalState) => (isLoading: boolean) => InternalState;
  setSavedDataViews: (state: InternalState) => (dataView: DataViewListItem[]) => InternalState;
  setAdHocDataViews: (state: InternalState) => (dataViews: DataViewLazy[]) => InternalState;
  appendAdHocDataViews: (
    state: InternalState
  ) => (dataViews: DataViewLazy | DataViewLazy[]) => InternalState;
  removeAdHocDataViewById: (state: InternalState) => (id: string) => InternalState;
  replaceAdHocDataViewWithId: (
    state: InternalState
  ) => (id: string, dataView: DataViewLazy) => InternalState;
  setExpandedDoc: (
    state: InternalState
  ) => (dataView: DataTableRecord | undefined) => InternalState;
  setCustomFilters: (state: InternalState) => (customFilters: Filter[]) => InternalState;
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
      savedDataViews: [],
      expandedDoc: undefined,
      customFilters: [],
    },
    {
      setDataView: (prevState: InternalState) => (nextDataView: DataViewLazy) => ({
        ...prevState,
        dataView: nextDataView,
      }),
      setIsDataViewLoading: (prevState: InternalState) => (loading: boolean) => ({
        ...prevState,
        isDataViewLoading: loading,
      }),
      setSavedDataViews: (prevState: InternalState) => (nextDataViewList: DataViewListItem[]) => ({
        ...prevState,
        savedDataViews: nextDataViewList,
      }),
      setAdHocDataViews: (prevState: InternalState) => (newAdHocDataViewList: DataViewLazy[]) => ({
        ...prevState,
        adHocDataViews: newAdHocDataViewList,
      }),
      appendAdHocDataViews:
        (prevState: InternalState) => (dataViewsAdHoc: DataViewLazy | DataViewLazy[]) => {
          // check for already existing data views
          const concatList = (
            Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc]
          ).filter((dataView) => {
            return !prevState.adHocDataViews.find((el: DataViewLazy) => el.id === dataView.id);
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
        (prevState: InternalState) => (prevId: string, newDataView: DataViewLazy) => ({
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
    },
    {},
    { freeze: (state) => state }
  );
}
