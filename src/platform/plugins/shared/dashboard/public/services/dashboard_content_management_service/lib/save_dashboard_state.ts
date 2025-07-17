/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getDashboardContentManagementCache } from '..';
import type {
  DashboardCreateIn,
  DashboardCreateOut,
  DashboardUpdateIn,
  DashboardUpdateOut,
} from '../../../../server/content_management';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
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
    generateNewIds: saveOptions.saveAsCopy, // When saving a dashboard as a copy, we should generate new IDs for all panels
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
    console.log('result----------', result);
    if ('error' in result) {
      throw Error(result.error.message);
    }

    const newId = result.meta.id;

    if (newId) {
      coreServices.notifications.toasts.addSuccess({
        title: i18n.translate('dashboard.dashboardWasSavedSuccessMessage', {
          defaultMessage: `Dashboard ''{title}'' was saved`,
          values: { title: dashboardState.title },
        }),
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
      title: i18n.translate('dashboard.dashboardWasNotSavedDangerMessage', {
        defaultMessage: `Dashboard ''{title}'' was not saved. Error: {errorMessage}`,
        values: {
          title: dashboardState.title,
          errorMessage: error.message,
        },
      }),
      'data-test-subj': 'saveDashboardFailure',
    });
    return { error };
  }
};
