/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../../common';
import { FetchStatus } from '../../../types';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from '../services/discover_search_session';
import { SavedSearch } from '../../../../saved_searches';

export function getInitialFetchStatus(
  savedSearch: SavedSearch,
  searchSessionManager: DiscoverSearchSessionManager,
  services: DiscoverServices
) {
  const { timefilter } = services.data.query.timefilter;
  const shouldSearchOnPageLoad =
    services.uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
    savedSearch.id !== undefined ||
    timefilter.getRefreshInterval().pause === false ||
    searchSessionManager.hasSearchSessionIdInURL();
  return shouldSearchOnPageLoad ? FetchStatus.LOADING : FetchStatus.UNINITIALIZED;
}
