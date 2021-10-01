/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../create';
import { PresentationDashboardsService } from '../dashboards';

// TODO (clint): Create set of dashboards to stub and return.

type DashboardsServiceFactory = PluginServiceFactory<PresentationDashboardsService>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const dashboardsServiceFactory: DashboardsServiceFactory = () => ({
  findDashboards: async (query: string = '', _fields: string[] = []) => {
    if (!query) {
      return [];
    }

    await sleep(2000);
    return [];
  },
  findDashboardsByTitle: async (title: string) => {
    if (!title) {
      return [];
    }

    await sleep(2000);
    return [];
  },
});
