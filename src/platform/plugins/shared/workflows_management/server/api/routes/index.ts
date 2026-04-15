/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { registerExecutionRoutes } from './executions';
import { registerInternalRoutes } from './internal';
import type { RouteDependencies } from './types';
import { WorkflowManagementAuditLog } from './utils/workflow_audit_logging';
import { registerWorkflowRoutes } from './workflows';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';

export function defineRoutes(
  router: WorkflowsRouter,
  api: WorkflowsManagementApi,
  logger: Logger,
  spaces: SpacesServiceStart,
  getWorkflowExecutionEngine: () => Promise<WorkflowsExecutionEnginePluginStart>,
  getSecurityServiceStart: () => SecurityServiceStart | undefined
) {
  const audit = new WorkflowManagementAuditLog({ getSecurityServiceStart });

  const deps: RouteDependencies = {
    router,
    api,
    logger,
    spaces,
    audit,
  };

  registerWorkflowRoutes(deps);
  registerExecutionRoutes(deps);
  registerInternalRoutes(deps, getWorkflowExecutionEngine);
}
