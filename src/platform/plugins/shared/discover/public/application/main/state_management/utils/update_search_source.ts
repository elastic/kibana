/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { ISearchSource } from '@kbn/data-plugin/common';
import { cloneDeep } from 'lodash';
import type { DiscoverAppState } from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import type { TabStateGlobalState } from '../redux';

/**
 * Updates the search source with a given data view & AppState
 * Is executed on every change of those, for making sure the search source is
 * up to date before fetching data and persisting or sharing
 * @param searchSource
 * @param dataView
 * @param appState
 * @param globalState
 * @param services
 * @param useFilterAndQueryServices - when true data services are being used for updating filter + query
 */
export function updateSearchSource({
  searchSource,
  dataView,
  appState,
  globalState,
  services,
  useFilterAndQueryServices = false,
}: {
  searchSource: ISearchSource;
  dataView: DataView | undefined;
  appState: DiscoverAppState | undefined;
  globalState: TabStateGlobalState | undefined;
  services: DiscoverServices;
  useFilterAndQueryServices?: boolean;
}) {
  if (dataView && searchSource.getField('index')?.id !== dataView.id) {
    searchSource.setField('index', dataView);
  }

  if (useFilterAndQueryServices) {
    searchSource
      .setField('query', services.data.query.queryString.getQuery())
      .setField('filter', services.data.query.filterManager.getFilters());
  } else if (appState) {
    const appFilters = appState.filters ? cloneDeep(appState.filters) : [];
    const globalFilters = globalState?.filters ? cloneDeep(globalState.filters) : [];

    searchSource
      .setField('query', appState.query ?? undefined)
      .setField('filter', [...globalFilters, ...appFilters]);
  }
}
