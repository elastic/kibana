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
import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { DataTableRecord } from '../../../types';

export interface DiscoverSharedState {
  dataView: DataView | undefined;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
  expandedDoc: DataTableRecord | undefined;
}

interface DiscoverSharedStateTransitions {
  setDataView: (state: DiscoverSharedState) => (dataView: DataView) => DiscoverSharedState;
  setSavedDataViews: (
    state: DiscoverSharedState
  ) => (dataView: DataViewListItem[]) => DiscoverSharedState;
  setAdHocDataViews: (state: DiscoverSharedState) => (dataViews: DataView[]) => DiscoverSharedState;
  appendAdHocDataViews: (
    state: DiscoverSharedState
  ) => (dataViews: DataView | DataView[]) => DiscoverSharedState;
  removeAdHocDataViewById: (state: DiscoverSharedState) => (id: string) => DiscoverSharedState;
  replaceAdHocDataViewWithId: (
    state: DiscoverSharedState
  ) => (id: string, dataView: DataView) => DiscoverSharedState;
  setExpandedDoc: (
    state: DiscoverSharedState
  ) => (dataView: DataTableRecord | undefined) => DiscoverSharedState;
}

export type DiscoverSharedStateContainer = ReduxLikeStateContainer<
  DiscoverSharedState,
  DiscoverSharedStateTransitions
>;

export const {
  Provider: DiscoverSharedStateProvider,
  useSelector: useDiscoverSharedStateSelector,
} = createStateContainerReactHelpers<ReduxLikeStateContainer<DiscoverSharedState>>();

export function getSharedStateContainer() {
  return createStateContainer<DiscoverSharedState, DiscoverSharedStateTransitions, {}>(
    {
      dataView: undefined,
      adHocDataViews: [],
      savedDataViews: [],
      expandedDoc: undefined,
    },
    {
      setDataView: (prevState: DiscoverSharedState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
      }),
      setSavedDataViews:
        (prevState: DiscoverSharedState) => (nextDataViewList: DataViewListItem[]) => ({
          ...prevState,
          savedDataViews: nextDataViewList,
        }),
      setAdHocDataViews:
        (prevState: DiscoverSharedState) => (newAdHocDataViewList: DataView[]) => ({
          ...prevState,
          adHocDataViews: newAdHocDataViewList,
        }),
      appendAdHocDataViews:
        (prevState: DiscoverSharedState) => (dataViewsAdHoc: DataView | DataView[]) => {
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
      removeAdHocDataViewById: (prevState: DiscoverSharedState) => (id: string) => ({
        ...prevState,
        adHocDataViews: prevState.adHocDataViews.filter((dataView) => dataView.id !== id),
      }),
      replaceAdHocDataViewWithId:
        (prevState: DiscoverSharedState) => (prevId: string, newDataView: DataView) => ({
          ...prevState,
          adHocDataViews: prevState.adHocDataViews.map((dataView) =>
            dataView.id === prevId ? newDataView : dataView
          ),
        }),
      setExpandedDoc:
        (prevState: DiscoverSharedState) => (expandedDoc: DataTableRecord | undefined) => ({
          ...prevState,
          expandedDoc,
        }),
    },
    {},
    { freeze: (state) => state }
  );
}
