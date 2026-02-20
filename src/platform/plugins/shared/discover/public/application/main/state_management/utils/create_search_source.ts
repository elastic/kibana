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
 * Creates a search source based on the provided data view and application state
 */
export function createSearchSource({
  dataView,
  appState,
  globalState,
  services,
}: {
  dataView: DataView | undefined;
  appState: DiscoverAppState | undefined;
  globalState: TabStateGlobalState | undefined;
  services: DiscoverServices;
}): ISearchSource {
  const searchSource = services.data.search.searchSource.createEmpty();

  if (dataView) {
    searchSource.setField('index', dataView);
  }

  if (appState) {
    const appFilters = appState.filters ? cloneDeep(appState.filters) : [];
    const globalFilters = globalState?.filters ? cloneDeep(globalState.filters) : [];

    searchSource
      .setField('query', appState.query ?? undefined)
      .setField('filter', [...globalFilters, ...appFilters]);
  }

  return searchSource;
}
