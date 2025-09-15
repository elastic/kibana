/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SORT_DEFAULT_ORDER_SETTING,
  DEFAULT_COLUMNS_SETTING,
} from '@kbn/discover-utils';
import type { DiscoverAppStateContainer } from '../discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import type { DiscoverServices } from '../../../../build_services';
import { getDataViewAppState } from './get_switch_data_view_app_state';
import { internalStateActions, type InternalStateStore, type RuntimeStateManager } from '../redux';

/**
 * Function executed when switching data view in the UI
 */
export async function changeDataView({
  dataViewId,
  services,
  internalState,
  runtimeStateManager,
  appState,
}: {
  dataViewId: string | DataView;
  services: DiscoverServices;
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  appState: DiscoverAppStateContainer;
}) {
  addLog('[ui] changeDataView', { id: dataViewId });

  const { dataViews, uiSettings } = services;
  const currentDataView = runtimeStateManager.currentDataView$.getValue();
  const state = appState.getState();
  let nextDataView: DataView | null = null;

  internalState.dispatch(internalStateActions.setIsDataViewLoading(true));

  try {
    nextDataView =
      typeof dataViewId === 'string' ? await dataViews.get(dataViewId, false) : dataViewId;

    // If nextDataView is an ad hoc data view with no fields, refresh its field list.
    // This can happen when default profile data views are created without fields
    // to avoid unnecessary requests on startup.
    if (!nextDataView.isPersisted() && !nextDataView.fields.length) {
      await dataViews.refreshFields(nextDataView);
    }
  } catch (e) {
    // Swallow the error and keep the current data view
  }

  if (nextDataView && currentDataView) {
    // Reset the default profile state if we are switching to a different data view
    internalState.dispatch(
      internalStateActions.setResetDefaultProfileState({
        columns: true,
        rowHeight: true,
        breakdownField: true,
        hideChart: true,
      })
    );

    const nextAppState = getDataViewAppState(
      currentDataView,
      nextDataView,
      uiSettings.get(DEFAULT_COLUMNS_SETTING, []),
      state.columns || [],
      (state.sort || []) as SortOrder[],
      uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      state.query
    );

    appState.update(nextAppState);

    if (internalState.getState().expandedDoc) {
      internalState.dispatch(internalStateActions.setExpandedDoc({ expandedDoc: undefined }));
    }
  }

  internalState.dispatch(internalStateActions.setIsDataViewLoading(false));
}
