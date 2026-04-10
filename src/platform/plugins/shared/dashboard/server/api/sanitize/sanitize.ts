/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState, Warnings } from '../types';
import type { DashboardSanitizeResponseBody } from './types';
import { transformDashboardIn, transformDashboardOut } from '../transforms';
import { stripUnmappedKeys } from '../scope_tooling';

const DEFAULT_DASHBOARD_TITLE = 'New dashboard';

type DashboardStateValidator = Readonly<{
  validate: (dashboardState: unknown) => DashboardState;
}>;

export async function sanitize(
  dashboardStateSchema: DashboardStateValidator,
  dashboardState: DashboardState
): Promise<DashboardSanitizeResponseBody> {
  const warnings: Warnings = [];

  const normalizedTitle = dashboardState.title.trim();
  const dashboardStateWithTitle: DashboardState =
    normalizedTitle.length > 0
      ? dashboardState
      : {
          ...dashboardState,
          title: DEFAULT_DASHBOARD_TITLE,
        };

  /**
   * Temporary escape hatch for lens as code
   * TODO remove transforms when lens as code transforms are ready for production
   * We need to run the full round-trip transform on the incoming state since Lens embeddable serializes
   * state in the editor format. Once we the Lens embeddable supports the API format we can remove the
   * transformDashboardIn and transformDashboardOut calls.
   */
  const { attributes: storedDashboardState, references } =
    transformDashboardIn(dashboardStateWithTitle);
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
}
