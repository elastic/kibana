/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { WORKFLOW_READ_SECURITY } from './route_security';
import { WORKFLOWS_CONFIG_PATH } from '../../../common/routes';
import type { WorkflowsRouter } from '../../types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerGetWorkflowsConfigRoute({
  router,
  getWorkflowExecutionEngine,
}: {
  router: WorkflowsRouter;
  getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>;
}) {
  router.get(
    {
      path: WORKFLOWS_CONFIG_PATH,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
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
