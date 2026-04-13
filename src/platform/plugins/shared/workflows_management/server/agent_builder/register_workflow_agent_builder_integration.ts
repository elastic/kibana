/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { registerWorkflowYamlAttachment } from './attachments/workflow_yaml_attachment';
import { registerWorkflowYamlDiffAttachment } from './attachments/workflow_yaml_diff_attachment';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { createWorkflowSmlType } from './sml_types/workflow';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import { registerWorkflowEditTools } from './tools/workflow_edit_tools';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import type { WorkflowsAiTelemetryClient } from '../telemetry/workflows_ai_telemetry_client';
import type { AgentBuilderPluginSetupContract } from '../types';

interface RegisterWorkflowAgentBuilderIntegrationParams {
  agentBuilder: AgentBuilderPluginSetupContract;
  logger: Logger;
  api: WorkflowsManagementApi;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
}

export function registerWorkflowAgentBuilderIntegration({
  agentBuilder,
  logger,
  api,
  aiTelemetryClient,
}: RegisterWorkflowAgentBuilderIntegrationParams): void {
  logger.debug('Registering workflow Agent Builder integration components');

  registerValidateWorkflowTool(agentBuilder, api);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder);
  registerGetConnectorsTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);

  registerWorkflowEditTools(agentBuilder, api, aiTelemetryClient);

  registerWorkflowYamlAttachment(agentBuilder, api);
  registerWorkflowYamlDiffAttachment(agentBuilder);

  agentBuilder.skills.register(workflowAuthoringSkill);

  agentBuilder.sml.registerType(createWorkflowSmlType(api));

  logger.debug('Workflow Agent Builder integration components registered');
}
