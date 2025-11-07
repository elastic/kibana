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
import type { DashboardAPIGetOut } from '../../server/content_management';
import { getAccessControlClient } from '../services/access_control_service';
import { CONTENT_ID } from '../../common/content_management';

export function initializeAccessControlManager(
  savedObjectResult?: DashboardAPIGetOut,
  savedObjectId$?: BehaviorSubject<string | undefined>
) {
  const accessControl$ = new BehaviorSubject<Partial<SavedObjectAccessControl>>({
    owner: savedObjectResult?.data?.accessControl?.owner,
    accessMode: savedObjectResult?.data?.accessControl?.accessMode,
  });

  async function changeAccessMode(accessMode: SavedObjectAccessControl['accessMode']) {
    const dashboardId = savedObjectId$?.value;
    if (!dashboardId) {
      throw new Error('Cannot change access mode: Dashboard ID is not available');
    }

    try {
      const client = getAccessControlClient();

      await client.changeAccessMode({
        objects: [{ id: dashboardId, type: CONTENT_ID }],
        accessMode: accessMode as SavedObjectAccessControl['accessMode'],
      });

      const currentAccessControl = accessControl$.value;
      accessControl$.next({
        ...currentAccessControl,
        accessMode,
      });
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
