/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RecentlyAccessedService } from '@kbn/recently-accessed';
import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { DashboardHTTPService } from '../http/types';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardRecentlyAccessedService } from './types';

interface DashboardRecentlyAccessedRequiredServices {
  http: DashboardHTTPService;
}

export type DashboardBackupServiceFactory = KibanaPluginServiceFactory<
  DashboardRecentlyAccessedService,
  DashboardStartDependencies,
  DashboardRecentlyAccessedRequiredServices
>;

export const dashboardRecentlyAccessedFactory: DashboardBackupServiceFactory = (
  core,
  requiredServices
) => {
  const { http } = requiredServices;
  return new RecentlyAccessedService().start({ http, key: 'dashboardRecentlyAccessed' });
};
