/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardState } from '../types';
import type { DashboardExportSourceResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardIn, transformDashboardOut } from '../transforms';
import { stripUnmappedKeys } from '../scope_tooling';

export async function exportSource(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  dashboardState: DashboardState
): Promise<DashboardExportSourceResponseBody> {
  try {
    const { attributes: storedDashboardState, references } = transformDashboardIn(dashboardState);
    const transformedApiDashboardState = transformDashboardOut(
      storedDashboardState ?? {},
      references ?? []
    );
    const { data: scopedDashboardState, warnings } = stripUnmappedKeys(
      transformedApiDashboardState as Partial<DashboardState>
    );
    const sanitizedDashboardState = dashboardStateSchema.validate(scopedDashboardState);
    return {
      data: sanitizedDashboardState,
      ...(warnings.length ? { warnings } : {}),
    };
  } catch (exportSourceError) {
    throw Boom.badRequest(`Invalid response. ${exportSourceError.message}`);
  }
}
