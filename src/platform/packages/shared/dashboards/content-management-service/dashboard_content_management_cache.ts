/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardGetOut } from '@kbn/dashboard-plugin/public';
import { LRUCache } from 'lru-cache';

const DASHBOARD_CACHE_SIZE = 20; // only store a max of 20 dashboards
const DASHBOARD_CACHE_TTL = 1000 * 60 * 5; // time to live = 5 minutes

export class DashboardContentManagementCache {
  private static instance: DashboardContentManagementCache;
  private cache: LRUCache<string, DashboardGetOut>;

  constructor() {
    this.cache = new LRUCache<string, DashboardGetOut>({
      max: DASHBOARD_CACHE_SIZE,
      ttl: DASHBOARD_CACHE_TTL,
    });
  }

  public static getInstance(): DashboardContentManagementCache {
    if (!DashboardContentManagementCache.instance) {
      DashboardContentManagementCache.instance = new DashboardContentManagementCache();
    }
    return DashboardContentManagementCache.instance;
  }

  /** Fetch the dashboard with `id` from the cache */
  public fetchDashboard(id: string) {
    return this.cache.get(id);
  }

  /** Add the fetched dashboard to the cache */
  public addDashboard({ item: dashboard, meta }: DashboardGetOut) {
    this.cache.set(dashboard.id, {
      meta,
      item: dashboard,
    });
  }

  /** Delete the dashboard with `id` from the cache */
  public deleteDashboard(id: string) {
    this.cache.delete(id);
  }
}
