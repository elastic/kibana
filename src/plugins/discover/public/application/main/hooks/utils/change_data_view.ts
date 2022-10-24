/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { DiscoverAppStateContainer } from '../../services/discover_app_state_container';
import { SavedSearchContainer } from '../../services/discover_saved_search_container';
import { getUrlTracker } from '../../../../kibana_services';
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/addLog';
import { getDataViewAppState } from '../../utils/get_switch_data_view_app_state';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';

async function getPreviousDataView(index: string | undefined, services: DiscoverServices) {
  const { dataViews } = services;
  if (!index) {
    return undefined;
  }
  try {
    return dataViews.get(index);
  } catch (e) {
    return undefined;
  }
}

export async function changeDataView(
  id: string,
  {
    appStateContainer,
    savedSearchContainer,
    services,
  }: {
    appStateContainer: DiscoverAppStateContainer;
    savedSearchContainer: SavedSearchContainer;
    services: DiscoverServices;
  }
) {
  const { dataViews, uiSettings } = services;
  const prevAppState = appStateContainer.getState();
  const nextDataView = await dataViews.get(id);
  const prevDataView = await getPreviousDataView(prevAppState.index, services);
  if (nextDataView) {
    const nextAppState = getDataViewAppState(
      prevDataView,
      nextDataView,
      prevAppState.columns || [],
      (prevAppState.sort || []) as SortOrder[],
      uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      prevAppState.query
    );

    const trackingEnabled = Boolean(
      nextDataView.isPersisted() || savedSearchContainer.isPersisted()
    );
    getUrlTracker().setTrackingEnabled(trackingEnabled);

    addLog('Change data view next app state', nextAppState);
    return { nextDataView, nextAppState };
  }
}
