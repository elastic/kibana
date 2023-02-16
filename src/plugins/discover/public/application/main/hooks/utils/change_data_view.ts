/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SortOrder } from '@kbn/saved-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { addLog } from '../../../../utils/add_log';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverStateContainer } from '../../services/discover_state';
import { getDataViewAppState } from '../../utils/get_switch_data_view_app_state';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';

/**
 * Function executed when switching data view in the UI
 * @param id
 * @param services
 * @param discoverState
 * @param setUrlTracking
 */
export async function changeDataView(
  id: string,
  {
    services,
    discoverState,
    setUrlTracking,
  }: {
    services: DiscoverServices;
    discoverState: DiscoverStateContainer;
    setUrlTracking: (dataView: DataView) => void;
  }
) {
  addLog('[ui] changeDataView', { id });
  const { dataViews, uiSettings } = services;
  const dataView = discoverState.internalState.getState().dataView;
  const state = discoverState.appState.getState();
  let nextDataView: DataView | null = null;

  try {
    nextDataView = await dataViews.get(id, false);
  } catch (e) {
    //
  }

  if (nextDataView && dataView) {
    const nextAppState = getDataViewAppState(
      dataView,
      nextDataView,
      state.columns || [],
      (state.sort || []) as SortOrder[],
      uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      state.query
    );

    setUrlTracking(nextDataView);
    discoverState.appState.update(nextAppState);
  }
}
