/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import type { AgentBuilderPluginSetupContract } from '../types';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

interface RegisterWorkflowAiIntegrationParams {
  agentBuilder: AgentBuilderPluginSetupContract;
  logger: Logger;
  api: WorkflowsManagementApi;
}

/**
 * Registers all AI integration components for the Workflows plugin.
 */
export function registerWorkflowAiIntegration({
  agentBuilder,
  logger,
  api,
}: RegisterWorkflowAiIntegrationParams): void {
  logger.debug('Registering workflow AI integration components');

  registerValidateWorkflowTool(agentBuilder, api);

  logger.debug('Workflow AI integration components registered');
}
