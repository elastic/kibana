/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG_DEFAULT } from '@kbn/as-code-shared-schemas';

import type { DashboardPanel, DashboardState, Warnings } from '../types';
import type { DashboardSanitizeResponseBody, PanelSanitizeResponseBody } from './types';
import { transformDashboardIn, transformDashboardOut } from '../transforms';
import { stripUnmappedKeys } from '../scope_tooling';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformPanelIn } from '../transforms/in/transform_panels_in';
import { transformPanelOut } from '../transforms/out/transform_panels_out';
import { getPanelReferences } from '../transforms/out/get_panel_references';
import { panelBwc } from '../transforms/out/panel_bwc';

export async function sanitizeDashboard(
  dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>,
  dashboardState: DashboardState,
  useGASchemas = AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG_DEFAULT
): Promise<DashboardSanitizeResponseBody> {
  const warnings: Warnings = [];
  /**
   * Temporary escape hatch for lens as code
   * TODO remove transforms when lens as code transforms are ready for production
   * We need to run the full round-trip transform on the incoming state since Lens embeddable serializes
   * state in the editor format. Once we the Lens embeddable supports the API format we can remove the
   * transformDashboardIn and transformDashboardOut calls.
   */
  const { attributes: storedDashboardState, references } = transformDashboardIn(
    dashboardState,
    undefined,
    undefined,
    useGASchemas
  );
  const { dashboardState: transformedApiDashboardState, warnings: dashboardStateWarnings } =
    transformDashboardOut(
      storedDashboardState ?? {},
      references ?? [],
      undefined,
      dashboardStateSchema,
      useGASchemas
    );

  const { data: scopedDashboardState, warnings: scopeWarnings } = stripUnmappedKeys(
    transformedApiDashboardState as Partial<DashboardState>
  );
  warnings.push(...dashboardStateWarnings, ...scopeWarnings);
  // TODO: As part of sanitization, we should drop panels, filters, etc. that exceed their max array sizes
  const sanitizedDashboardState = dashboardStateSchema.validate(scopedDashboardState);

  // access_control is separate from the transforms and stripping logic since it is not part of the
  // dashboard saved object attributes but it should be preserved in the sanitized output if present
  // in the incoming dashboard state
  const { access_control } = dashboardState;
  return {
    data: {
      ...sanitizedDashboardState,
      ...(access_control !== undefined && { access_control }),
    },
    ...(warnings.length ? { warnings } : {}),
  };
}

export async function sanitizePanel(
  panelState: DashboardPanel,
  useGASchemas = AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG_DEFAULT
): Promise<PanelSanitizeResponseBody> {
  const { storedPanel, references } = transformPanelIn(panelState, undefined, useGASchemas);
  const storedPanelReferences = getPanelReferences(references ?? [], storedPanel);
  const { panel, panelReferences } = panelBwc(storedPanel, storedPanelReferences ?? []);

  const { type, config } = transformPanelOut(
    panel,
    panelReferences,
    undefined,
    undefined,
    useGASchemas
  );

  return {
    data: { type, config },
    warnings: [],
  };
}
