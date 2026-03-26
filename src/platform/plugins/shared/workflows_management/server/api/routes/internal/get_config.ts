/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowsRouter } from '../../../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerGetConfigRoute({
  router,
  getWorkflowExecutionEngine,
}: {
  router: WorkflowsRouter;
  getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
}) {
  router.versioned
    .get({
      path: '/internal/workflows/config',
      access: 'internal',
      security: WORKFLOW_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withLicenseCheck(async (_context, _request, response) => {
        const engine = await getWorkflowExecutionEngine();
        return response.ok({
          body: {
            eventDrivenExecutionEnabled: engine.isEventDrivenExecutionEnabled(),
          },
        });
      })
    );
}
