/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { registerWorkflowEditorAgent } from './agents/workflow_editor_agent';
import { registerWorkflowYamlAttachment } from './attachments/workflow_yaml_attachment';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetWorkflowExamplesTool } from './tools/get_workflow_examples_tool';
import type { AgentBuilderPluginSetupContract } from '../types';

interface RegisterWorkflowAiIntegrationParams {
  agentBuilder: AgentBuilderPluginSetupContract;
  logger: Logger;
}

/**
 * Registers all AI integration components for the Workflows plugin:
 * - Attachment types for workflow YAML context
 * - Tools for step definitions and example workflows
 * - The workflow editor agent
 */
export function registerWorkflowAiIntegration({
  agentBuilder,
  logger,
}: RegisterWorkflowAiIntegrationParams): void {
  logger.debug('Registering workflow AI integration components');

  // Register attachment type for workflow YAML
  registerWorkflowYamlAttachment(agentBuilder);

  // Register tools
  registerGetStepDefinitionsTool(agentBuilder);
  registerGetWorkflowExamplesTool(agentBuilder, logger);

  // Register the workflow editor agent
  registerWorkflowEditorAgent(agentBuilder);

  logger.debug('Workflow AI integration components registered');
}
