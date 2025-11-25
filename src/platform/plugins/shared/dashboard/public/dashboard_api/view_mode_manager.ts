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
import { BehaviorSubject } from 'rxjs';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

export function initializeViewModeManager({
  incomingEmbeddables,
  isManaged,
  savedObjectId,
}: {
  incomingEmbeddables?: EmbeddablePackageState[];
  isManaged: boolean;
  savedObjectId?: string;
}) {
  const dashboardBackupService = getDashboardBackupService();
  function getInitialViewMode() {
    if (isManaged || !getDashboardCapabilities().showWriteControls) {
      return 'view';
    }

    if (
      incomingEmbeddables?.length ||
      !Boolean(savedObjectId) ||
      dashboardBackupService.dashboardHasUnsavedEdits(savedObjectId)
    )
      return 'edit';

    return dashboardBackupService.getViewMode();
  }

  const viewMode$ = new BehaviorSubject<ViewMode>(getInitialViewMode());

  function setViewMode(viewMode: ViewMode) {
    // block the Dashboard from entering edit mode if this Dashboard is managed.
    if (isManaged && viewMode?.toLowerCase() === 'edit') {
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
