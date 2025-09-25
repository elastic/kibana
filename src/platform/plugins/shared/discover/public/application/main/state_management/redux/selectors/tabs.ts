/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from '@reduxjs/toolkit';
import type { DiscoverInternalState } from '../types';
import { TabsBarVisibility, type TabState } from '../types';

export const selectTab = (state: DiscoverInternalState, tabId: string) => state.tabs.byId[tabId];
export const selectOpenTab = (state: DiscoverInternalState, tabId: string): TabState | undefined =>
  state.tabs.allIds.includes(tabId) ? state.tabs.byId[tabId] : undefined;

export const selectAllTabs = createSelector(
  [
    (state: DiscoverInternalState) => state.tabs.allIds,
    (state: DiscoverInternalState) => state.tabs.byId,
  ],
  (allIds, byId) => allIds.map((id) => byId[id])
);

export const selectRecentlyClosedTabs = (state: DiscoverInternalState) =>
  state.tabs.recentlyClosedTabs;

export const selectIsTabsBarHidden = createSelector(
  (state: DiscoverInternalState) => state.tabsBarVisibility,
  (tabsBarVisibility) => tabsBarVisibility === TabsBarVisibility.hidden
);
