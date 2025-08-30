/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { AccessControl } from '../dashboard_app/access_control';
import { getDashboardContentManagementService } from '../services/dashboard_content_management_service';
import type { LoadDashboardReturn } from '../services/dashboard_content_management_service/types';

export function initializeAccessControlManager(
  savedObjectResult?: LoadDashboardReturn,
  savedObjectId$?: BehaviorSubject<string | undefined>
) {
  const accessControl$ = new BehaviorSubject<AccessControl>({
    owner: savedObjectResult?.accessControl?.owner,
    accessMode: savedObjectResult?.accessControl?.accessMode,
  });

  async function changeAccessMode(accessMode: 'read_only' | 'default') {
    const dashboardId = savedObjectId$?.value;
    if (!dashboardId) {
      throw new Error('Cannot change access mode: Dashboard ID is not available');
    }

    try {
      await getDashboardContentManagementService().changeAccessMode({
        ids: [dashboardId],
        accessMode,
      });

      // Update the local state
      const currentAccessControl = accessControl$.value;
      accessControl$.next({
        ...currentAccessControl,
        accessMode,
      });
    } catch (error) {
      // Re-throw the error to let the caller handle it
      throw error;
    }
  }

  return {
    api: {
      accessControl$,
      changeAccessMode,
    },
  };
}
