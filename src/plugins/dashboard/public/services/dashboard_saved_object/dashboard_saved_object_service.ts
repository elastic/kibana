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
  findDashboardIdByTitle,
  findDashboardSavedObjects,
  findDashboardSavedObjectsByIds,
} from './lib/find_dashboard_saved_objects';
import { saveDashboardStateToSavedObject } from './lib/save_dashboard_state_to_saved_object';
import { loadDashboardStateFromSavedObject } from './lib/load_dashboard_state_from_saved_object';
import type { DashboardSavedObjectRequiredServices, DashboardSavedObjectService } from './types';

export type DashboardSavedObjectServiceFactory = KibanaPluginServiceFactory<
  DashboardSavedObjectService,
  DashboardStartDependencies,
  DashboardSavedObjectRequiredServices
>;

export const dashboardSavedObjectServiceFactory: DashboardSavedObjectServiceFactory = (
  { coreStart },
  requiredServices
) => {
  const {
    savedObjects: { client: savedObjectsClient },
  } = coreStart;

  return {
    loadDashboardStateFromSavedObject: ({ id }) =>
      loadDashboardStateFromSavedObject({
        id,
        savedObjectsClient,
        ...requiredServices,
      }),
    saveDashboardStateToSavedObject: ({ currentState, saveOptions, lastSavedId }) =>
      saveDashboardStateToSavedObject({
        saveOptions,
        lastSavedId,
        currentState,
        savedObjectsClient,
        ...requiredServices,
      }),
    findDashboards: {
      findSavedObjects: ({ hasReference, hasNoReference, search, size }) =>
        findDashboardSavedObjects({
          hasReference,
          hasNoReference,
          search,
          size,
          savedObjectsClient,
        }),
      findByIds: (ids) => findDashboardSavedObjectsByIds(savedObjectsClient, ids),
      findByTitle: (title) => findDashboardIdByTitle(title, savedObjectsClient),
    },
    checkForDuplicateDashboardTitle: (props) =>
      checkForDuplicateDashboardTitle(props, savedObjectsClient),
    savedObjectsClient,
  };
};
