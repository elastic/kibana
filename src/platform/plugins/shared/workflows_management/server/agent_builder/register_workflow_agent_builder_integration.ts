/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { registerWorkflowYamlAttachment } from './attachments/workflow_yaml_attachment';
import { registerWorkflowYamlDiffAttachment } from './attachments/workflow_yaml_diff_attachment';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { stepExecutionSkill } from './skills/step_execution_skill';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerGetWorkflowTool } from './tools/get_workflow_tool';
import { registerListWorkflowsTool } from './tools/list_workflows_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import { registerWorkflowEditTools } from './tools/workflow_edit_tools';
import { registerStepTools } from './tools/register_step_tools';
import { workflowTools } from '../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import type { WorkflowsAiTelemetryClient } from '../telemetry/workflows_ai_telemetry_client';
import type { AgentBuilderPluginSetupContract, WorkflowsServerPluginStartDeps } from '../types';

interface RegisterWorkflowAgentBuilderIntegrationParams {
  agentBuilder: AgentBuilderPluginSetupContract;
  logger: Logger;
  api: WorkflowsManagementApi;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
  coreSetup: CoreSetup<WorkflowsServerPluginStartDeps>;
}

export function registerWorkflowAgentBuilderIntegration({
  agentBuilder,
  logger,
  api,
  aiTelemetryClient,
  coreSetup,
}: RegisterWorkflowAgentBuilderIntegrationParams): void {
  logger.debug('Registering workflow Agent Builder integration components');

  registerValidateWorkflowTool(agentBuilder, api);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder);
  registerGetConnectorsTool(agentBuilder, api);
  registerListWorkflowsTool(agentBuilder, api);
  registerGetWorkflowTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);

  registerWorkflowEditTools(agentBuilder, api, aiTelemetryClient);

  registerWorkflowYamlAttachment(agentBuilder, api);
  registerWorkflowYamlDiffAttachment(agentBuilder);

  agentBuilder.skills.register(workflowAuthoringSkill);

  // PoC: Register workflow steps as individual AB tools
  logger.info('Registering step-tools for AB integration...');
  let stepToolIds: string[] = [];
  try {
    stepToolIds = registerStepTools(agentBuilder, coreSetup);
    logger.info(`Step-tools registered successfully (${stepToolIds.length} tools)`);
  } catch (err) {
    logger.error(`Failed to register step-tools: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Register skill with step tool IDs + get_connectors so the agent can discover connectors
  try {
    agentBuilder.skills.register({
      ...stepExecutionSkill,
      getRegistryTools: () => [...stepToolIds, workflowTools.getConnectors],
    });
    logger.info('Step execution skill registered successfully');
  } catch (err) {
    logger.error(`Failed to register step execution skill: ${err instanceof Error ? err.message : String(err)}`);
  }

  logger.debug('Workflow Agent Builder integration components registered (including step-tools)');
}
