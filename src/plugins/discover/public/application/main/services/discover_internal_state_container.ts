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
import { DataView } from '@kbn/data-views-plugin/common';

export interface InternalState {
  dataView: DataView | undefined;
  dataViewAdHocList: DataView[];
}

interface InternalStateTransitions {
  setDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  appendAdHocDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  removeAdHocDataViewById: (state: InternalState) => (id: string) => InternalState;
  replaceAdHocDataViewWithId: (
    state: InternalState
  ) => (id: string, dataView: DataView) => InternalState;
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
      dataViewAdHocList: [],
    },
    {
      setDataView: (prevState: InternalState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
      }),
      appendAdHocDataView: (prevState: InternalState) => (dataViewAdHoc: DataView) => ({
        ...prevState,
        dataViewAdHocList: prevState.dataViewAdHocList.concat(dataViewAdHoc),
      }),
      removeAdHocDataViewById: (prevState: InternalState) => (id: string) => ({
        ...prevState,
        dataViewAdHocList: prevState.dataViewAdHocList.filter((dataView) => dataView.id !== id),
      }),
      replaceAdHocDataViewWithId:
        (prevState: InternalState) => (prevId: string, newDataView: DataView) => ({
          ...prevState,
          dataViewAdHocList: prevState.dataViewAdHocList.map((dataView) =>
            dataView.id === prevId ? newDataView : dataView
          ),
        }),
    },
    {},
    { freeze: (state) => state }
  );
}
