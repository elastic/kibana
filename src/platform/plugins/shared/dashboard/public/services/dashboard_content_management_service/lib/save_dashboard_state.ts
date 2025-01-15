/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDashboardContentManagementCache } from '..';
import type {
  DashboardCreateIn,
  DashboardCreateOut,
  DashboardUpdateIn,
  DashboardUpdateOut,
} from '../../../../server/content_management';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { dashboardSaveToastStrings } from '../../../dashboard_container/_dashboard_container_strings';
import { getDashboardBackupService } from '../../dashboard_backup_service';
import { contentManagementService, coreServices } from '../../kibana_services';
import { SaveDashboardProps, SaveDashboardReturn } from '../types';
import { getSerializedState } from '../../../dashboard_api/get_serialized_state';

export const saveDashboardState = async ({
  controlGroupReferences,
  lastSavedId,
  saveOptions,
  dashboardState,
  panelReferences,
  searchSourceReferences,
}: SaveDashboardProps): Promise<SaveDashboardReturn> => {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  const { attributes, references } = getSerializedState({
    controlGroupReferences,
    generateNewIds: saveOptions.saveAsCopy,
    dashboardState,
    panelReferences,
    searchSourceReferences,
  });

  /**
   * Save the saved object using the content management
   */
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;

  try {
    const result = idToSaveTo
      ? await contentManagementService.client.update<DashboardUpdateIn, DashboardUpdateOut>({
          id: idToSaveTo,
          contentTypeId: DASHBOARD_CONTENT_ID,
          data: attributes,
          options: {
            references,
            /** perform a "full" update instead, where the provided attributes will fully replace the existing ones */
            mergeAttributes: false,
          },
        })
      : await contentManagementService.client.create<DashboardCreateIn, DashboardCreateOut>({
          contentTypeId: DASHBOARD_CONTENT_ID,
          data: attributes,
          options: {
            references,
          },
        });
    const newId = result.item.id;

    if (newId) {
      coreServices.notifications.toasts.addSuccess({
        title: dashboardSaveToastStrings.getSuccessString(dashboardState.title),
        className: 'eui-textBreakWord',
        'data-test-subj': 'saveDashboardSuccess',
      });

      /**
       * If the dashboard id has been changed, redirect to the new ID to keep the url param in sync.
       */
      if (newId !== lastSavedId) {
        getDashboardBackupService().clearState(lastSavedId);
        return { redirectRequired: true, id: newId, references };
      } else {
        dashboardContentManagementCache.deleteDashboard(newId); // something changed in an existing dashboard, so delete it from the cache so that it can be re-fetched
      }
    }
    return { id: newId, references };
  } catch (error) {
    coreServices.notifications.toasts.addDanger({
      title: dashboardSaveToastStrings.getFailureString(dashboardState.title, error.message),
      'data-test-subj': 'saveDashboardFailure',
    });
    return { error };
  }
};
