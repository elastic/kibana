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
import { DataViewListItem } from '@kbn/data-views-plugin/common';

export interface InternalState {
  dataViews: DataViewListItem[];
  dataViewsAdHoc: DataViewListItem[];
  savedSearchLoading: boolean;
}

interface InternalStateTransitions {
  setDataViews: (state: InternalState) => (dataViews: DataViewListItem[]) => InternalState;
  setDataViewsAdHoc: (state: InternalState) => (dataViews: DataViewListItem[]) => InternalState;
  setSavedSearchLoading: (state: InternalState) => (isLoading: boolean) => InternalState;
}

export type DiscoverInternalState = ReduxLikeStateContainer<
  InternalState,
  InternalStateTransitions
>;

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<InternalState>>();

export function getInternalStateContainer() {
  return createStateContainer<InternalState, InternalStateTransitions>(
    {
      dataViews: [],
      dataViewsAdHoc: [],
      savedSearchLoading: true,
    },
    {
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
    }
  );
}
