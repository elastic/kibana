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
import { dashboardContentManagementServiceFactory } from './dashboard_content_management/dashboard_content_management.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  dashboardContentManagement: new PluginServiceProvider(dashboardContentManagementServiceFactory),
  dashboardBackup: new PluginServiceProvider(dashboardBackupServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
