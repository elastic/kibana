/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SortOrder } from '@kbn/saved-search-plugin/public';
import { ReduxLikeStateContainer } from '@kbn/kibana-utils-plugin/common';
import { getUrlTracker } from '../../../../kibana_services';
import { AppState, SavedSearchContainer } from '../../services/discover_state';
import { DiscoverServices } from '../../../../build_services';
import { addLog } from '../../../../utils/addLog';
import { getDataViewAppState } from '../../utils/get_switch_data_view_app_state';
import { MODIFY_COLUMNS_ON_SWITCH, SORT_DEFAULT_ORDER_SETTING } from '../../../../../common';

export async function changeDataView(
  id: string,
  {
    appStateContainer,
    savedSearchContainer,
    services,
    setAppState,
  }: {
    appStateContainer: ReduxLikeStateContainer<AppState>;
    savedSearchContainer: SavedSearchContainer;
    services: DiscoverServices;
    setAppState: (state: AppState) => void;
  }
) {
  addLog('Change data view start', id);
  const { dataViews, uiSettings } = services;
  const prevAppState = appStateContainer.getState();
  const prevDataView = await dataViews.get(prevAppState.index!);
  const nextDataView = await dataViews.get(id);
  if (nextDataView && prevDataView) {
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
    setAppState(nextAppState);
  }
}
