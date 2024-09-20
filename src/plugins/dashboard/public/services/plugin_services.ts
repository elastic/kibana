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

const providers: PluginServiceProviders<DashboardServices, DashboardPluginServiceParams> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory, [
    'dashboardBackup',
  ]),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),
  dashboardContentInsights: new PluginServiceProvider(dashboardContentInsightsServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<DashboardServices, DashboardPluginServiceParams>(
  providers
);
