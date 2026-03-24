/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { coreServices } from '../../services/kibana_services';
import { dashboardClient } from '../../dashboard_client';
import type { SaveDashboardProps, SaveDashboardReturn } from './types';

export const saveDashboard = async ({
  lastSavedId,
  saveOptions,
  dashboardState,
  accessMode,
}: SaveDashboardProps): Promise<SaveDashboardReturn> => {
  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;

  try {
    const result = idToSaveTo
      ? await dashboardClient.update(idToSaveTo, dashboardState)
      : await dashboardClient.create(dashboardState, accessMode);

    const newId = result.id;

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
        return { redirectRequired: true, id: newId };
      }
    }
    return { id: newId };
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
