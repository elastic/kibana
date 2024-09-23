/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { RecentlyAccessedService, type RecentlyAccessed } from '@kbn/recently-accessed';

import type { DashboardStartDependencies } from '../plugin';
import { getDashboardBackupService } from './dashboard_backup/dashboard_backup_service';
import { getDashboardContentManagementService } from './dashboard_content_management/get_dashboard_content_management_service';
import { DashboardContentManagementService } from './dashboard_content_management/types';

export let dashboardBackupService: ReturnType<typeof getDashboardBackupService>;
export let dashboardContentManagementService: DashboardContentManagementService;
export let dashboardRecentlyAccessedService: RecentlyAccessed;

export const setDashboardServices = (kibanaCore: CoreStart, deps: DashboardStartDependencies) => {
  dashboardBackupService = getDashboardBackupService();
  dashboardContentManagementService = getDashboardContentManagementService(deps);
  dashboardRecentlyAccessedService = new RecentlyAccessedService().start({
    http: kibanaCore.http,
    key: 'dashboardRecentlyAccessed',
  });
};
