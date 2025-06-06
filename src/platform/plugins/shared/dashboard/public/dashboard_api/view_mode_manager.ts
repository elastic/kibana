/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

export function initializeViewModeManager(
  incomingEmbeddable?: EmbeddablePackageState,
  savedObjectResult?: LoadDashboardReturn
) {
  const dashboardBackupService = getDashboardBackupService();
  function getInitialViewMode() {
    if (savedObjectResult?.managed || !getDashboardCapabilities().showWriteControls) {
      return 'view';
    }

    if (
      incomingEmbeddable ||
      savedObjectResult?.newDashboardCreated ||
      dashboardBackupService.dashboardHasUnsavedEdits(savedObjectResult?.dashboardId)
    )
      return 'edit';

    return dashboardBackupService.getViewMode();
  }

  const viewMode$ = new BehaviorSubject<ViewMode>(getInitialViewMode());

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
