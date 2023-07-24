/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardCrudTypes } from '../../../common/content_management';

export class DashboardContentManagementCache {
  private cache: {
    [dashboardId: string]: DashboardCrudTypes['GetOut'] & {
      lastFetched: Date;
    };
  };

  constructor() {
    this.cache = {};
  }

  /**
   * Fetch the dashboard with `id` from the cache, if it exists, and return it as long as it has been
   * less than 5 minutes since the dashboard was last fetched
   */
  public fetchDashboard(id: string) {
    if (this.cache[id] && Math.abs(+new Date() - +this.cache[id].lastFetched) < 300000)
      return this.cache[id];
  }

  /** Add the fetched dashboard to the cache with an updated `lastFetched` date */
  public addDashboard({ item: dashboard, meta }: DashboardCrudTypes['GetOut']) {
    this.cache[dashboard.id] = {
      meta,
      item: dashboard,
      lastFetched: new Date(),
    };
  }

  /** Delete the dashboard with `id` from the cache, if it exists */
  public deleteDashboard(id: string) {
    if (this.cache[id]) delete this.cache[id];
  }
}
