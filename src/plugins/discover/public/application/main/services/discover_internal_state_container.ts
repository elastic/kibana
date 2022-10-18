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
import { DataViewListItem, DataView } from '@kbn/data-views-plugin/common';

export interface InternalState {
  dataView: DataView | undefined;
  dataViews: DataViewListItem[];
  dataViewsAdHoc: DataViewListItem[];
  savedSearchLoading: boolean;
}

interface InternalStateTransitions {
  setDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  setDataViews: (state: InternalState) => (dataViews: DataViewListItem[]) => InternalState;
  setDataViewsAdHoc: (state: InternalState) => (dataViews: DataViewListItem[]) => InternalState;
  setSavedSearchLoading: (state: InternalState) => (isLoading: boolean) => InternalState;
}

export type InternalStateContainer = ReduxLikeStateContainer<
  InternalState,
  InternalStateTransitions
>;

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<InternalState>>();

export function getInternalStateContainer() {
  return createStateContainer<InternalState, InternalStateTransitions, {}>(
    {
      dataView: undefined,
      dataViews: [],
      dataViewsAdHoc: [],
      savedSearchLoading: true,
    },
    {
      setDataView: (prevState: InternalState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
      }),
      setDataViews: (prevState: InternalState) => (dataViews: DataViewListItem[]) => ({
        ...prevState,
        dataViews,
      }),
      setDataViewsAdHoc: (prevState: InternalState) => (dataViewsAdHoc: DataViewListItem[]) => ({
        ...prevState,
        dataViewsAdHoc,
      }),
      setSavedSearchLoading: (prevState: InternalState) => (isLoading: boolean) => ({
        ...prevState,
        savedSearchLoading: isLoading,
      }),
    },
    {},
    { freeze: (state) => state }
  );
}
