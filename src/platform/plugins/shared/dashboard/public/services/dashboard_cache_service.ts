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

// Simple in-memory cache - lasts for the browser session, cleared on page refresh
const cache = new Map<string, DashboardCacheEntry>();

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
};
