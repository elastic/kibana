/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import { FavoritesClient } from '@kbn/content-management-favorites-public';
import type { CoreStart } from '@kbn/core/public';
import { RecentlyAccessedService, type RecentlyAccessed } from '@kbn/recently-accessed';

import type { DashboardCapabilities } from '../../common';
import { DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID } from '../dashboard_constants';
import type { DashboardStartDependencies } from '../plugin';

export let dashboardCapabilitiesService: { dashboardCapabilities: DashboardCapabilities };
export let dashboardFavoritesService: FavoritesClient;
export let dashboardInsightsService: ReturnType<typeof getDashboardInsightsService>;
export let dashboardRecentlyAccessedService: RecentlyAccessed;

export const setDashboardServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  dashboardCapabilitiesService = {
    dashboardCapabilities: getDashboardCapabilities(kibanaCore),
  };
  dashboardFavoritesService = new FavoritesClient(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID, {
    http: kibanaCore.http,
    usageCollection: deps.usageCollection,
  });
  dashboardInsightsService = getDashboardInsightsService(kibanaCore);
  dashboardRecentlyAccessedService = new RecentlyAccessedService().start({
    http: kibanaCore.http,
    key: 'dashboardRecentlyAccessed',
  });
};

const getDashboardInsightsService = (kibanaCore: CoreStart) => {
  const contentInsightsClient = new ContentInsightsClient(
    { http: kibanaCore.http },
    { domainId: 'dashboard' }
  );

  return {
    trackDashboardView: (dashboardId: string) => {
      contentInsightsClient.track(dashboardId, 'viewed');
    },
    contentInsightsClient,
  };
};

const getDashboardCapabilities = (coreStart: CoreStart): DashboardCapabilities => {
  const {
    application: {
      capabilities: { dashboard },
    },
  } = coreStart;

  return {
    show: Boolean(dashboard.show),
    saveQuery: Boolean(dashboard.saveQuery),
    createNew: Boolean(dashboard.createNew),
    createShortUrl: Boolean(dashboard.createShortUrl),
    showWriteControls: Boolean(dashboard.showWriteControls),
    storeSearchSession: Boolean(dashboard.storeSearchSession),
  };
};
