/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewListItem, DataViewSpec } from '@kbn/data-views-plugin/common';
import { DiscoverServices } from '../../build_services';
import { loadDataView, resolveDataView } from './utils/resolve_data_view';

export const loadDataViewBySavedSearch = async (
  nextSavedSearch: SavedSearch,
  dataViewId: string | undefined,
  dataViewList: DataViewListItem[],
  services: DiscoverServices,
  dataViewSpec?: DataViewSpec
) => {
  const ip = await loadDataView(dataViewList, services, dataViewId, dataViewSpec);
  const dataViewData = resolveDataView(
    ip,
    nextSavedSearch.searchSource,
    services.toastNotifications
  );
  await services.dataViews.refreshFields(dataViewData);

  return dataViewData;
};
