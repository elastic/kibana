/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerGetWorkflowTool } from './tools/get_workflow_tool';
import { registerListWorkflowsTool } from './tools/list_workflows_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import type { AgentBuilderPluginSetupContract } from '../types';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';

interface RegisterWorkflowAgentBuilderIntegrationParams {
  agentBuilder: AgentBuilderPluginSetupContract;
  logger: Logger;
  api: WorkflowsManagementApi;
}

export function registerWorkflowAgentBuilderIntegration({
  agentBuilder,
  logger,
  api,
}: RegisterWorkflowAgentBuilderIntegrationParams): void {
  logger.debug('Registering workflow Agent Builder integration components');

  registerValidateWorkflowTool(agentBuilder, api);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder);
  registerGetConnectorsTool(agentBuilder, api);
  registerListWorkflowsTool(agentBuilder, api);
  registerGetWorkflowTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);

  agentBuilder.skills.register(workflowAuthoringSkill);

  logger.debug('Workflow Agent Builder integration components registered');
}
