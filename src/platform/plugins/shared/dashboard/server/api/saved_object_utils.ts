/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { DashboardState } from './types';
import { transformDashboardOut } from './transforms';

export function getDashboardMeta(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>,
  operation: 'create' | 'read' | 'update' | 'search'
) {
  return {
    error: savedObject.error,
    managed: savedObject.managed,
    updated_at: savedObject.updated_at,
    updated_by: savedObject.updated_by,
    version: savedObject.version ?? '',
    ...(['create', 'read', 'search'].includes(operation) && {
      created_at: savedObject.created_at,
      created_by: savedObject.created_by,
    }),
  };
}

// CRU is Create, Read, Update
export function getDashboardCRUResponseBody(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>,
  operation: 'create' | 'read' | 'update' | 'search'
) {
  let dashboardState: DashboardState;
  try {
    dashboardState = transformDashboardOut(
      savedObject.attributes,
      savedObject.references
    ) as DashboardState;
  } catch (transformOutError) {
    throw Boom.badRequest(`Invalid response. ${transformOutError.message}`);
  }

  return {
    id: savedObject.id,
    data: {
      ...dashboardState,
      ...(savedObject?.accessControl && {
        access_control: {
          access_mode: savedObject.accessControl.accessMode,
          owner: savedObject.accessControl.owner,
        },
      }),
    },
    meta: getDashboardMeta(savedObject, operation),
    spaces: savedObject.namespaces,
  };
}
