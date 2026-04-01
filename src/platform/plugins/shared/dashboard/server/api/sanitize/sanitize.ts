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
import type { DashboardState, Warnings } from '../types';
import type { DashboardSanitizeResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardIn, transformDashboardOut } from '../transforms';
import { stripUnmappedKeys } from '../scope_tooling';

export async function sanitize(
  requestCtx: RequestHandlerContext,
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  dashboardState: DashboardState
): Promise<DashboardSanitizeResponseBody> {
  const warnings: Warnings = [];
  try {
    /**
     * Temporary escape hatch for lens as code
     * TODO remove transforms when lens as code transforms are ready for production
     * We need to run the full round-trip transform on the incoming state since Lens embeddable serializes
     * state in the editor format. Once we the Lens embeddable supports the API format we can remove the
     * transformDashboardIn and transformDashboardOut calls.
     */
    const {
      attributes: storedDashboardState,
      references,
      error,
    } = transformDashboardIn(dashboardState);
    if (error) throw error;
    const { dashboardState: transformedApiDashboardState, warnings: dashboardStateWarnings } =
      transformDashboardOut(storedDashboardState ?? {}, references ?? []);

    const { data: scopedDashboardState, warnings: scopeWarnings } = stripUnmappedKeys(
      transformedApiDashboardState as Partial<DashboardState>
    );
    warnings.push(...dashboardStateWarnings, ...scopeWarnings);
    const sanitizedDashboardState = dashboardStateSchema.validate(scopedDashboardState);
    return {
      data: sanitizedDashboardState,
      ...(warnings.length ? { warnings } : {}),
    };
  } catch (sanitizeError) {
    throw Boom.badRequest(`Invalid response. ${sanitizeError.message}`);
  }
}
