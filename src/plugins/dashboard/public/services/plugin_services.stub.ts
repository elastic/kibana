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
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';

import { dashboardBackupServiceFactory } from './dashboard_backup/dashboard_backup.stub';
import { dashboardContentInsightsServiceFactory } from './dashboard_content_insights/dashboard_content_insights.stub';
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management.stub';
import { dashboardFavoritesServiceFactory } from './dashboard_favorites/dashboard_favorites_service.stub';
import { dashboardRecentlyAccessedServiceFactory } from './dashboard_recently_accessed/dashboard_recently_accessed.stub';
import { initializerContextServiceFactory } from './initializer_context/initializer_context.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),
  initializerContext: new PluginServiceProvider(initializerContextServiceFactory),
  dashboardRecentlyAccessed: new PluginServiceProvider(dashboardRecentlyAccessedServiceFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
  dashboardFavorites: new PluginServiceProvider(dashboardFavoritesServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
