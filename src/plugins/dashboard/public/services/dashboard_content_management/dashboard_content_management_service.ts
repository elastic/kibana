/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import type { DashboardStartDependencies } from '../../plugin';
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
import type {
  DashboardContentManagementRequiredServices,
  DashboardContentManagementService,
} from './types';

export type DashboardContentManagementServiceFactory = KibanaPluginServiceFactory<
  DashboardContentManagementService,
  DashboardStartDependencies,
  DashboardContentManagementRequiredServices
>;

export const dashboardContentManagementCache = new DashboardContentManagementCache();

export const dashboardContentManagementServiceFactory: DashboardContentManagementServiceFactory = (
  { startPlugins: { contentManagement } },
  requiredServices
) => {
  const { dashboardBackup } = requiredServices;
  return {
    loadDashboardState: ({ id }) =>
      loadDashboardState({
        id,
        contentManagement,
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
        contentManagement,
      }),
    findDashboards: {
      search: ({ hasReference, hasNoReference, search, size, options }) =>
        searchDashboards({
          contentManagement,
          hasNoReference,
          hasReference,
          options,
          search,
          size,
        }),
      findById: (id) => findDashboardById(contentManagement, id),
      findByIds: (ids) => findDashboardsByIds(contentManagement, ids),
      findByTitle: (title) => findDashboardIdByTitle(contentManagement, title),
    },
    checkForDuplicateDashboardTitle: (props) =>
      checkForDuplicateDashboardTitle(props, contentManagement),
    deleteDashboards: (ids) => deleteDashboards(ids, contentManagement),
    updateDashboardMeta: (props) => updateDashboardMeta(props, { contentManagement }),
  };
};
