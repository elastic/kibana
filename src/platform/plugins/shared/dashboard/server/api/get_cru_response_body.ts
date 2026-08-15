/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import type { RequestTiming } from '@kbn/core-http-server';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PanelTypeMigrationContext } from '@kbn/embeddable-plugin/server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import type { getDashboardStateSchema } from './dashboard_state_schemas';
import { stripUnmappedKeys } from './scope_tooling';
import { transformDashboardOut } from './transforms';
import type { DashboardState, Operation, Warnings } from './types';

// CRU is Create, Read, Update
export async function getDashboardCRUResponseBody(
  savedObject:
    | SavedObject<DashboardSavedObjectAttributes>
    | SavedObjectsUpdateResponse<DashboardSavedObjectAttributes>,
  operation: Operation,
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>,
  isDashboardAppRequest: boolean = false,
  serverTiming?: RequestTiming,
  useGASchemas?: boolean,
  savedObjectsClient?: SavedObjectsClientContract
) {
  const timer = serverTiming?.start('transform-dashboard-out');

  let dashboardState: DashboardState;
  const warnings: Warnings = [];
  try {
    let dashboardStateWarnings;
    const migrationContext: PanelTypeMigrationContext | undefined =
      operation === 'read' && savedObjectsClient
        ? { savedObjectsClient, allowMissingTargetSchema: isDashboardAppRequest }
        : undefined;

    ({ dashboardState, warnings: dashboardStateWarnings } = await transformDashboardOut(
      savedObject.attributes,
      savedObject.references,
      isDashboardAppRequest,
      strictValidationSchema,
      useGASchemas,
      migrationContext
    ));
    warnings.push(...dashboardStateWarnings);
    if (!isDashboardAppRequest && operation === 'read') {
      const { data: scopedDashboardState, warnings: scopeWarnings } = stripUnmappedKeys(
        dashboardState as Partial<DashboardState>
      );
      dashboardState = scopedDashboardState;
      warnings.push(...scopeWarnings);
    }
  } finally {
    timer?.end();
  }

  const result = {
    id: savedObject.id,
    data: {
      ...dashboardState,
      ...(savedObject?.accessControl && {
        access_control: {
          access_mode: savedObject.accessControl.accessMode,
        },
      }),
    },
    meta: getMeta(savedObject),
    ...(operation === 'read' && warnings?.length && { warnings }),
  };

  return result;
}
