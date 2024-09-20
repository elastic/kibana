/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardBackupServiceType } from '../dashboard_backup/types';
import { DashboardStartDependencies } from '../../plugin';
import { loadDashboardState } from './lib/load_dashboard_state';
import { saveDashboardState } from './lib/save_dashboard_state';
import { DashboardContentManagementService } from './types';
import {
  findDashboardById,
  findDashboardIdByTitle,
  findDashboardsByIds,
  searchDashboards,
} from './lib/find_dashboards';
import { checkForDuplicateDashboardTitle } from './lib/check_for_duplicate_dashboard_title';
import { deleteDashboards } from './lib/delete_dashboards';
import { updateDashboardMeta } from './lib/update_dashboard_meta';

export const getDashboardContentManagementService = (
  dashboardBackup: DashboardBackupServiceType,
  deps: DashboardStartDependencies
): DashboardContentManagementService => {
  return {
    loadDashboardState: ({ id }) =>
      loadDashboardState({
        id,
        contentManagement: deps.contentManagement,
      }),
    saveDashboardState: ({
      controlGroupReferences,
      currentState,
      saveOptions,
      lastSavedId,
      panelReferences,
    }) =>
      saveDashboardState({
        controlGroupReferences,
        saveOptions,
        lastSavedId,
        currentState,
        panelReferences,
        dashboardBackup,
        contentManagement: deps.contentManagement,
      }),
    findDashboards: {
      search: ({ hasReference, hasNoReference, search, size, options }) =>
        searchDashboards({
          contentManagement: deps.contentManagement,
          hasNoReference,
          hasReference,
          options,
          search,
          size,
        }),
      findById: (id) => findDashboardById(deps.contentManagement, id),
      findByIds: (ids) => findDashboardsByIds(deps.contentManagement, ids),
      findByTitle: (title) => findDashboardIdByTitle(deps.contentManagement, title),
    },
    checkForDuplicateDashboardTitle: (props) =>
      checkForDuplicateDashboardTitle(props, deps.contentManagement),
    deleteDashboards: (ids) => deleteDashboards(ids, deps.contentManagement),
    updateDashboardMeta: (props) =>
      updateDashboardMeta(props, { contentManagement: deps.contentManagement }),
  };
};
