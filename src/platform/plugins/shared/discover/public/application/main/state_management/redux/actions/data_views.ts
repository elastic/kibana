/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { differenceBy } from 'lodash';
import {
  internalStateSlice,
  type TabActionPayload,
  type InternalStateThunkActionCreator,
} from '../internal_state';
import { selectTabRuntimeState } from '../runtime_state';
import { createInternalStateAsyncThunk } from '../utils';

export const loadDataViewList = createInternalStateAsyncThunk(
  'internalState/loadDataViewList',
  async (_, { extra: { services } }) => services.dataViews.getIdsWithTitle(true)
);

export const setDataView: InternalStateThunkActionCreator<
  [TabActionPayload<{ dataView: DataView }>]
> =
  ({ tabId, dataView }) =>
  (dispatch, _, { runtimeStateManager }) => {
    dispatch(
      internalStateSlice.actions.setDataViewId({
        tabId,
        dataViewId: dataView.id,
      })
    );
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    currentDataView$.next(dataView);
  };

export const setAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]> =
  (adHocDataViews) =>
  (_, __, { runtimeStateManager }) => {
    runtimeStateManager.adHocDataViews$.next(adHocDataViews);
  };

export const setDefaultProfileAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]> =
  (defaultProfileAdHocDataViews) =>
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
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds(defaultProfileAdHocDataViewIds)
    );
  };

export const appendAdHocDataViews: InternalStateThunkActionCreator<[DataView | DataView[]]> =
  (dataViewsAdHoc) =>
  (dispatch, _, { runtimeStateManager }) => {
    const prevAdHocDataViews = runtimeStateManager.adHocDataViews$.getValue();
    const newDataViews = Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc];
    const existingDataViews = differenceBy(prevAdHocDataViews, newDataViews, 'id');

    dispatch(setAdHocDataViews(existingDataViews.concat(newDataViews)));
  };

export const replaceAdHocDataViewWithId: InternalStateThunkActionCreator<[string, DataView]> =
  (prevId, newDataView) =>
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
      internalStateSlice.actions.setDefaultProfileAdHocDataViewIds(defaultProfileAdHocDataViewIds)
    );
  };
