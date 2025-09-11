/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject, from } from 'rxjs';
import { coreServices } from '../services/kibana_services';
import { CONTENT_ID } from '../../common/content_management';
import { getAccessControlClient } from '../services/access_control_service';
import type { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

export function initializeViewModeManager(
  incomingEmbeddable?: EmbeddablePackageState,
  savedObjectResult?: LoadDashboardReturn
) {
  const dashboardBackupService = getDashboardBackupService();
  const accessControlClient = getAccessControlClient();

  const viewMode$ = new BehaviorSubject<ViewMode>('view');

  async function resolveInitialViewMode(): Promise<ViewMode> {
    const user = await coreServices?.userProfile.getCurrent();
    const canManageDashboard = await accessControlClient.canManageAccessControl({
      accessControl: savedObjectResult?.accessControl,
      createdBy: savedObjectResult?.createdBy,
      uid: user?.uid,
      contentTypeId: CONTENT_ID,
    });

    if (
      savedObjectResult?.managed ||
      !getDashboardCapabilities().showWriteControls ||
      !canManageDashboard
    ) {
      return 'view';
    }

    if (
      incomingEmbeddable ||
      savedObjectResult?.newDashboardCreated ||
      dashboardBackupService.dashboardHasUnsavedEdits(savedObjectResult?.dashboardId)
    ) {
      return 'edit';
    }

    return dashboardBackupService.getViewMode();
  }

  from(resolveInitialViewMode()).subscribe((mode) => viewMode$.next(mode));

  function setViewMode(viewMode: ViewMode) {
    // block the Dashboard from entering edit mode if this Dashboard is managed.
    if (savedObjectResult?.managed && viewMode?.toLowerCase() === 'edit') {
      return;
    }
    viewMode$.next(viewMode);
  }

  return {
    api: {
      viewMode$,
      setViewMode,
    },
  };
}
