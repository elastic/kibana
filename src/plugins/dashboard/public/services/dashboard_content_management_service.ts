/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardContentManagementCache } from './dashboard_content_management/dashboard_content_management_cache';
import { checkForDuplicateDashboardTitle } from './dashboard_content_management/lib/check_for_duplicate_dashboard_title';
import { deleteDashboards } from './dashboard_content_management/lib/delete_dashboards';
import {
  findDashboardById,
  findDashboardIdByTitle,
  findDashboardsByIds,
  searchDashboards,
} from './dashboard_content_management/lib/find_dashboards';
import { loadDashboardState } from './dashboard_content_management/lib/load_dashboard_state';
import { saveDashboardState } from './dashboard_content_management/lib/save_dashboard_state';
import { updateDashboardMeta } from './dashboard_content_management/lib/update_dashboard_meta';
import { DashboardContentManagementService } from './dashboard_content_management/types';

export let dashboardContentManagementService: DashboardContentManagementService;
export let dashboardContentManagementCache: DashboardContentManagementCache;

export const setDashboardContentManagementService = () => {
  dashboardContentManagementCache = new DashboardContentManagementCache();

  dashboardContentManagementService = {
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
