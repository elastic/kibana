/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/common';
import { DiscoverAppStateContainer } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { loadDataView, resolveDataView } from './resolve_data_view';

export const loadDataViewBySavedSearch = async (
  nextSavedSearch: SavedSearch,
  appStateContainer: DiscoverAppStateContainer,
  dataViewList: DataViewListItem[],
  services: DiscoverServices,
  onError: (e: Error) => void,
  dataViewSpec?: DataViewSpec
) => {
  try {
    const { index } = appStateContainer.getState();
    const ip = await loadDataView(services.dataViews, services.uiSettings, index, dataViewSpec);
    const dataViewData = resolveDataView(
      ip,
      nextSavedSearch.searchSource,
      services.toastNotifications
    );
    await services.data.dataViews.refreshFields(dataViewData);

    return dataViewData;
  } catch (e) {
    onError(e);
  }
};
