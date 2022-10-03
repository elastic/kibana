/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DiscoverStateContainer } from './services/discover_state';
import { DiscoverServices } from '../../build_services';
import { loadDataView, resolveDataView } from './utils/resolve_data_view';

export const loadDataViewBySavedSearch = async (
  nextSavedSearch: SavedSearch,
  stateContainer: DiscoverStateContainer,
  services: DiscoverServices,
  onError: (e: Error) => void,
  dataViewSpec?: DataViewSpec
) => {
  try {
    const { index } = stateContainer.appStateContainer.getState();
    const ip = await loadDataView(
      services.data.dataViews,
      services.uiSettings,
      index,
      dataViewSpec
    );
    const ipList = ip.list;
    stateContainer.internalStateContainer.transitions.setDataViews(ipList);
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
