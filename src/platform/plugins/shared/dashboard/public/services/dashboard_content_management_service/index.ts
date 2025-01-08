/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardContentManagementCache } from './dashboard_content_management_cache';
import { checkForDuplicateDashboardTitle } from './lib/check_for_duplicate_dashboard_title';
import { deleteDashboards } from './lib/delete_dashboards';
import {
  findDashboardById,
  findDashboardIdByTitle,
  findDashboardsByIds,
  searchDashboards,
} from './lib/find_dashboards';
import { loadDashboardState } from './lib/load_dashboard_state';
import { saveDashboardState } from './lib/save_dashboard_state';
import { updateDashboardMeta } from './lib/update_dashboard_meta';

let dashboardContentManagementCache: DashboardContentManagementCache;

export const getDashboardContentManagementCache = () => {
  if (!dashboardContentManagementCache)
    dashboardContentManagementCache = new DashboardContentManagementCache();
  return dashboardContentManagementCache;
};

export const getDashboardContentManagementService = () => {
  return {
    loadDashboardState,
    saveDashboardState,
    findDashboards: {
      search: searchDashboards,
      findById: findDashboardById,
      findByIds: findDashboardsByIds,
      findByTitle: findDashboardIdByTitle,
    },
    checkForDuplicateDashboardTitle,
    deleteDashboards,
    updateDashboardMeta,
  };
};
