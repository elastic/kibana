/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSelector } from '@reduxjs/toolkit';
import type { DiscoverInternalState, RecentlyClosedTabState } from './types';

export const selectTab = (state: DiscoverInternalState, tabId: string) => state.tabs.byId[tabId];

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
    (state: DiscoverInternalState) => state.tabs.byId,
  ],
  (recentlyClosedTabIds, byId) =>
    recentlyClosedTabIds
      .map((id) => byId[id])
      .filter((tab) => tab && 'closedAt' in tab) as RecentlyClosedTabState[]
);
