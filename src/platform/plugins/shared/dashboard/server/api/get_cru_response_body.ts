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
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { DashboardState } from './types';
import { transformDashboardOut } from './transforms';
import type { getDashboardStateSchema } from './dashboard_state_schemas';
import { stripUnmappedKeys } from './scope_tooling';
import type { Warnings } from './types';

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
  const warnings: Warnings = [];
  try {
    // eslint-disable-next-line prefer-const
    let { dashboardState, warnings: dashboardStateWarnings } = transformDashboardOut(
      savedObject.attributes,
      savedObject.references,
      isDashboardAppRequest
    );
    warnings.push(...dashboardStateWarnings);
    if (!isDashboardAppRequest && operation === 'read') {
      const { data: scopedDashboardState, warnings: scopeWarnings } = stripUnmappedKeys(
        dashboardState as Partial<DashboardState>
      );
      dashboardState = scopedDashboardState;
      warnings.push(...scopeWarnings);
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
        },
      }),
    },
    meta: getMeta(savedObject),
    ...(operation === 'read' && warnings?.length && { warnings }),
  };
}
