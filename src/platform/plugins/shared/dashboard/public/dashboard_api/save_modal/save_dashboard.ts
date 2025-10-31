/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import type { DashboardState } from '../../../common';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { coreServices } from '../../services/kibana_services';
import { dashboardClient } from '../../dashboard_client';

export type SavedDashboardSaveOpts = SavedObjectSaveOpts & { saveAsCopy?: boolean };

export interface SaveDashboardProps {
  dashboardState: DashboardState;
  references: Reference[];
  saveOptions: SavedDashboardSaveOpts;
  searchSourceReferences?: Reference[];
  lastSavedId?: string;
}

export interface GetDashboardStateReturn {
  attributes: DashboardState;
  references: Reference[];
}

export interface SaveDashboardReturn {
  id?: string;
  error?: string;
  references?: Reference[];
  redirectRequired?: boolean;
}

export const saveDashboard = async ({
  lastSavedId,
  saveOptions,
  dashboardState,
  references,
}: SaveDashboardProps): Promise<SaveDashboardReturn> => {
  /**
   * Save the saved object using the content management
   */
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;

  try {
    const result = idToSaveTo
      ? await dashboardClient.update(idToSaveTo, dashboardState, references)
      : await dashboardClient.create(dashboardState, references);

    const newId = result?.item.id;

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
