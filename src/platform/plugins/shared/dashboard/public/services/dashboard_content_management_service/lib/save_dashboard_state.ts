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
import type { SaveDashboardProps, SaveDashboardReturn } from '../types';
import { getSerializedState } from '../../../dashboard_api/get_serialized_state';

export const saveDashboardState = async ({
  controlGroupReferences,
  lastSavedId,
  saveOptions,
  dashboardState,
  panelReferences,
}: SaveDashboardProps): Promise<SaveDashboardReturn> => {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  const { attributes, references } = getSerializedState({
    controlGroupReferences,
    generateNewIds: saveOptions.saveAsCopy,
    dashboardState,
    panelReferences,
  });

  const idToSaveTo = saveOptions.saveAsCopy ? undefined : lastSavedId;

  try {
    let result;

    if (idToSaveTo) {
      result = await coreServices.http.put(`/api/dashboards/dashboard/${idToSaveTo}`, {
        ...attributes,
        references,
      });
    } else {
      result = await coreServices.http.post('/api/dashboards/dashboard', {
        ...attributes,
        references,
      });
    }

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

      if (newId !== lastSavedId) {
        getDashboardBackupService().clearState(lastSavedId);
        return { redirectRequired: true, id: newId, references };
      } else {
        dashboardContentManagementCache.deleteDashboard(newId);
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
