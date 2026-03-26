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
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardUser } from './types';
import { getAccessControlClient } from '../services/access_control_service';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

export function initializeViewModeManager({
  incomingEmbeddables,
  isManaged,
  savedObjectId,
  accessControl,
  createdBy,
  user,
}: {
  incomingEmbeddables?: EmbeddablePackageState[];
  isManaged: boolean;
  savedObjectId?: string;
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
  user?: DashboardUser;
}) {
  const dashboardBackupService = getDashboardBackupService();
  const accessControlClient = getAccessControlClient();

  const isDashboardInEditAccessMode = accessControlClient.isInEditAccessMode(accessControl);

  const canUserManageAccessControl =
    user?.hasGlobalAccessControlPrivilege ||
    accessControlClient.checkUserAccessControl({
      accessControl,
      createdBy,
      userId: user?.uid,
    });

  const canUserEditDashboard = isDashboardInEditAccessMode || canUserManageAccessControl;

  function getInitialViewMode() {
    if (isManaged || !getDashboardCapabilities().showWriteControls || !canUserEditDashboard) {
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
      isEditableByUser: canUserEditDashboard,
    },
  };
}
