/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

import { SAVED_OBJECT_DELETE_TIME } from '../../../utils/telemetry_constants';
import { coreServices, contentManagementService } from '../../../services/kibana_services';
import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { dashboardClient } from '../../../dashboard_client';
import { dashboardListingErrorStrings } from '../../_dashboard_listing_strings';

interface DeleteDashboardListingItemsParams {
  itemsToDelete: Array<{ id: string; type?: string }>;
}
export async function deleteDashboardListingItems({
  itemsToDelete,
}: DeleteDashboardListingItemsParams): Promise<void> {
  const dashboardBackupService = getDashboardBackupService();

  try {
    const deleteStartTime = window.performance.now();

    await asyncMap(itemsToDelete, async ({ id, type }) => {
      if (type === 'dashboard') {
        await dashboardClient.delete(id);
        dashboardBackupService.clearState(id);
      } else if (type) {
        await contentManagementService.client.delete({
          contentTypeId: type,
          id,
        });
      }
    });

    reportPerformanceMetricEvent(coreServices.analytics, {
      eventName: SAVED_OBJECT_DELETE_TIME,
      duration: window.performance.now() - deleteStartTime,
      meta: {
        saved_object_type: itemsToDelete[0]?.type ?? 'unknown',
        total: itemsToDelete.length,
      },
    });
  } catch (error) {
    coreServices.notifications.toasts.addError(error, {
      title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
    });
  }
}
