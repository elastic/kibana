/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { KibanaPluginServiceParams } from '@kbn/presentation-util-plugin/public';

import { DashboardStartDependencies } from '../plugin';
import { DashboardBackupServiceType } from './dashboard_backup/types';
import { DashboardContentManagementService } from './dashboard_content_management/types';

export type DashboardPluginServiceParams = KibanaPluginServiceParams<DashboardStartDependencies> & {
  initContext: PluginInitializerContext; // need a custom type so that initContext is a required parameter for initializerContext
};
export interface DashboardServices {
  dashboardBackup: DashboardBackupServiceType;
  dashboardContentManagement: DashboardContentManagementService;
}
