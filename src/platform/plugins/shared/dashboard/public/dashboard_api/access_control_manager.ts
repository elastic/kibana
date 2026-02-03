/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import type { DashboardReadResponseBody } from '../../server';
import { getAccessControlClient } from '../services/access_control_service';
import { dashboardClient } from '../dashboard_client';

export function initializeAccessControlManager(
  savedObjectResult?: DashboardReadResponseBody,
  savedObjectId$?: BehaviorSubject<string | undefined>
) {
  const accessControl$ = new BehaviorSubject<Partial<SavedObjectAccessControl>>({
    owner: savedObjectResult?.data?.access_control?.owner,
    accessMode: savedObjectResult?.data?.access_control?.access_mode,
  });

  async function changeAccessMode(accessMode: SavedObjectAccessControl['accessMode']) {
    const dashboardId = savedObjectId$?.value;
    if (!dashboardId) {
      throw new Error('Cannot change access mode: Dashboard ID is not available');
    }

    try {
      const client = getAccessControlClient();

      await client.changeAccessMode({
        objects: [{ id: dashboardId, type: DASHBOARD_SAVED_OBJECT_TYPE }],
        accessMode: accessMode as SavedObjectAccessControl['accessMode'],
      });

      const currentAccessControl = accessControl$.value;
      accessControl$.next({
        ...currentAccessControl,
        accessMode,
      });
      dashboardClient.invalidateCache(dashboardId);
    } catch (error) {
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
