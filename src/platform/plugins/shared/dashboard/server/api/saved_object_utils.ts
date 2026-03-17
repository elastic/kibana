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
import type { getDashboardStateSchema } from './dashboard_state_schemas';
import { stripUnmappedKeys } from './scope_tooling';

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
  operation: 'create' | 'read' | 'update' | 'search',
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  isDashboardAppRequest: boolean = false
) {
  let sanatizedDashboardState: DashboardState;
  let warnings: string[] = [];
  try {
    let dashboardState = transformDashboardOut(
      savedObject.attributes,
      savedObject.references,
      isDashboardAppRequest
    );
    if (!isDashboardAppRequest && operation === 'read') {
      const { data: scopedDashboardState, warnings: scopeWarnings } = stripUnmappedKeys(
        dashboardState as Partial<DashboardState>
      );
      dashboardState = scopedDashboardState;
      warnings = scopeWarnings;
    }

    // Route does not apply defaults to response
    // Instead, call validate to ensure defaults are applied to response
    sanatizedDashboardState = dashboardStateSchema.validate(dashboardState);
  } catch (transformOutError) {
    throw Boom.badRequest(`Invalid response. ${transformOutError.message}`);
  }

  return {
    id: savedObject.id,
    data: {
      ...sanatizedDashboardState,
      ...(savedObject?.accessControl && {
        access_control: {
          access_mode: savedObject.accessControl.accessMode,
          owner: savedObject.accessControl.owner,
        },
      }),
    },
    meta: getDashboardMeta(savedObject, operation),
    ...(warnings?.length && { warnings }),
  };
}
