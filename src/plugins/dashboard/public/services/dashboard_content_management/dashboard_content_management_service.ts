/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import type { DashboardStartDependencies } from '../../plugin';
import { checkForDuplicateDashboardTitle } from './lib/check_for_duplicate_dashboard_title';

import {
  searchDashboards,
  findDashboardsByIds,
  findDashboardIdByTitle,
} from './lib/find_dashboards';
import { saveDashboardState } from './lib/save_dashboard_state';
import type {
  DashboardContentManagementRequiredServices,
  DashboardContentManagementService,
} from './types';
import { loadDashboardState } from './lib/load_dashboard_state';
import { deleteDashboards } from './lib/delete_dashboards';
import { updateDashboardMeta } from './lib/update_dashboard_meta';

export type DashboardContentManagementServiceFactory = KibanaPluginServiceFactory<
  DashboardContentManagementService,
  DashboardStartDependencies,
  DashboardContentManagementRequiredServices
>;

export const dashboardContentManagementServiceFactory: DashboardContentManagementServiceFactory = (
  { startPlugins: { contentManagement } },
  requiredServices
) => {
  const {
    data,
    embeddable,
    notifications,
    initializerContext,
    savedObjectsTagging,
    dashboardSessionStorage,
  } = requiredServices;
  return {
    loadDashboardState: ({ id }) =>
      loadDashboardState({
        id,
        data,
        embeddable,
        contentManagement,
        savedObjectsTagging,
      }),
    saveDashboardState: ({ currentState, saveOptions, lastSavedId }) =>
      saveDashboardState({
        data,
        embeddable,
        saveOptions,
        lastSavedId,
        currentState,
        notifications,
        contentManagement,
        initializerContext,
        savedObjectsTagging,
        dashboardSessionStorage,
      }),
    findDashboards: {
      search: ({ hasReference, hasNoReference, search, size }) =>
        searchDashboards({
          contentManagement,
          hasNoReference,
          hasReference,
          search,
          size,
        }),
      findByIds: (ids) => findDashboardsByIds(contentManagement, ids),
      findByTitle: (title) => findDashboardIdByTitle(contentManagement, title),
    },
    checkForDuplicateDashboardTitle: (props) =>
      checkForDuplicateDashboardTitle(props, contentManagement),
    deleteDashboards: (ids) => deleteDashboards(ids, contentManagement),
    updateDashboardMeta: (props) =>
      updateDashboardMeta(props, { contentManagement, savedObjectsTagging, embeddable }),
  };
};
