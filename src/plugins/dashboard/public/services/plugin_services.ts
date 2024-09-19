/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from '@kbn/presentation-util-plugin/public';

import { DashboardPluginServiceParams, DashboardServices } from './types';

import { dashboardBackupServiceFactory } from './dashboard_backup/dashboard_backup_service';
import { dashboardContentInsightsServiceFactory } from './dashboard_content_insights/dashboard_content_insights_service';
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management_service';
import { dashboardFavoritesServiceFactory } from './dashboard_favorites/dashboard_favorites_service';
import { dashboardRecentlyAccessedFactory } from './dashboard_recently_accessed/dashboard_recently_accessed';
import { initializerContextServiceFactory } from './initializer_context/initializer_context_service';

const providers: PluginServiceProviders<DashboardServices, DashboardPluginServiceParams> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory, [
    'initializerContext',
    'dashboardBackup',
  ]),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),

  initializerContext: new PluginServiceProvider(initializerContextServiceFactory),
  dashboardRecentlyAccessed: new PluginServiceProvider(dashboardRecentlyAccessedFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
  dashboardFavorites: new PluginServiceProvider(dashboardFavoritesServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<DashboardServices, DashboardPluginServiceParams>(
  providers
);
