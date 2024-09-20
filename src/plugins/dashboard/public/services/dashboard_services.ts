/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { CoreStart } from '@kbn/core/public';
import { type RecentlyAccessed, RecentlyAccessedService } from '@kbn/recently-accessed';

import type { DashboardCapabilities } from '../../common';
import { DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID } from '../dashboard_constants';
import type { DashboardStartDependencies } from '../plugin';
import { getDashboardCapabilities } from './utils/get_dashboard_capabilities';

export let capabilitiesService: { dashboardCapabilities: DashboardCapabilities };
export let favoritesService: FavoritesClient;
export let recentlyAccessedService: RecentlyAccessed;

export const setDashboardServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  capabilitiesService = {
    dashboardCapabilities: getDashboardCapabilities(kibanaCore),
  };
  favoritesService = new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID, {
    http: kibanaCore.http,
    usageCollection: deps.usageCollection,
  });
  recentlyAccessedService = new RecentlyAccessedService().start({
    http: kibanaCore.http,
    key: 'dashboardRecentlyAccessed',
  });
};
