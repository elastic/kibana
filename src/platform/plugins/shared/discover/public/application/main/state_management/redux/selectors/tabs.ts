/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from '@reduxjs/toolkit';
import { isOfAggregateQueryType, type Filter } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import type { DiscoverInternalState, TabState } from '../types';
import { TabsBarVisibility } from '../types';

export const selectTab = (state: DiscoverInternalState, tabId: string) => state.tabs.byId[tabId];

export const selectTabAppState = (state: DiscoverInternalState, tabId: string) =>
  selectTab(state, tabId).appState;

const EMPTY_FILTERS: Filter[] = [];

export const selectTabCombinedFilters = createSelector(
  [
    (tab: TabState) => tab.globalState.filters,
    (tab: TabState) => tab.appState.filters,
    (tab: TabState) => tab.appState.query,
  ],
  (globalFilters, appFilters, query) => {
    if (isOfAggregateQueryType(query)) {
      return EMPTY_FILTERS;
    }
    const allFilters = [...(globalFilters ?? []), ...(appFilters ?? [])];
    return allFilters.length ? cloneDeep(allFilters) : EMPTY_FILTERS;
  }
);

export const selectAllTabs = createSelector(
  [
    (state: DiscoverInternalState) => state.tabs.allIds,
    (state: DiscoverInternalState) => state.tabs.byId,
  ],
  (allIds, byId) => allIds.map((id) => byId[id])
);

export const selectRecentlyClosedTabs = createSelector(
  [
    (state: DiscoverInternalState) => state.tabs.recentlyClosedTabIds,
    (state: DiscoverInternalState) => state.tabs.recentlyClosedTabsById,
  ],
  (recentlyClosedTabIds, byId) => recentlyClosedTabIds.map((id) => byId[id])
);

export const selectIsTabsBarHidden = createSelector(
  (state: DiscoverInternalState) => state.tabsBarVisibility,
  (tabsBarVisibility) => tabsBarVisibility === TabsBarVisibility.hidden
);
