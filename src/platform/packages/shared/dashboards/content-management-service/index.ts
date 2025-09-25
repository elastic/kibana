/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { DashboardContentManagementCache } from './dashboard_content_management_cache';
import type { SearchDashboardsArgs } from './lib/find_dashboards';
import {
  findDashboardById,
  findDashboardIdByTitle,
  findDashboardsByIds,
  searchDashboards,
} from './lib/find_dashboards';

let dashboardContentManagementCache: DashboardContentManagementCache;

export const getDashboardContentManagementCache = () => {
  if (!dashboardContentManagementCache)
    dashboardContentManagementCache = new DashboardContentManagementCache();
  return dashboardContentManagementCache;
};

export const getFindDashboardsService = (
  contentManagementService: ContentManagementPublicStart
) => {
  return {
    search: (args: SearchDashboardsArgs) => searchDashboards(args, contentManagementService),
    findById: (id: string) => findDashboardById(id, contentManagementService),
    findByIds: (ids: string[]) => findDashboardsByIds(ids, contentManagementService),
    findByTitle: (title: string) => findDashboardIdByTitle(title, contentManagementService),
  };
};
