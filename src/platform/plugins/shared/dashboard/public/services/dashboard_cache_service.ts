/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';

export interface DashboardCacheEntry {
  sessionId: string;
  absoluteTimeRange: TimeRange; // Resolved time at session creation (ISO strings)
}

// 'always'    = auto-refresh whenever the time window has moved past the cached snapshot
// 'tolerance' = only refresh when the drift exceeds 5% of the cached range length
// 'never'     = leave it to the user to manually refresh
export type RevalidationMode = 'always' | 'tolerance' | 'never';

// Simple in-memory cache - lasts for the browser session, cleared on page refresh
const cache = new Map<string, DashboardCacheEntry>();
let revalidationMode: RevalidationMode = 'always';

export const dashboardCacheService = {
  getCacheEntry: (dashboardId: string): DashboardCacheEntry | undefined => cache.get(dashboardId),
  setCacheEntry: (dashboardId: string, entry: DashboardCacheEntry): void => {
    cache.set(dashboardId, entry);
  },
  clearCacheEntry: (dashboardId: string): void => {
    cache.delete(dashboardId);
  },
  clearAll: (): void => {
    cache.clear();
  },
  getRevalidationMode: (): RevalidationMode => revalidationMode,
  setRevalidationMode: (mode: RevalidationMode): void => {
    revalidationMode = mode;
  },
};
