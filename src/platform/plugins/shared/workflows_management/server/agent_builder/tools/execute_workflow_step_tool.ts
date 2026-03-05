/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';

export const EXECUTE_WORKFLOW_STEP_TOOL_ID = 'platform.workflows.execute_workflow_step';

export function registerExecuteWorkflowStepTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: EXECUTE_WORKFLOW_STEP_TOOL_ID,
    type: ToolType.builtin,
    description: `Execute a single step within a workflow for testing purposes.

**When to use:** When the user wants to test or debug a specific step in a workflow without running the entire workflow.
**Human confirmation:** This tool requires explicit user confirmation before execution because it performs real actions.

Provide the full workflow YAML (so the engine knows the step context), the step ID to run,
and an optional context override with mock data for upstream step outputs.

Returns a workflow execution ID that can be used with get_workflow_execution_status to poll for results.`,
    schema: z.object({
      workflowYaml: z
        .string()
        .describe('The complete workflow YAML containing the step to execute'),
      stepId: z.string().describe('The name/ID of the step to execute within the workflow'),
      contextOverride: z
        .record(z.string(), z.any())
        .optional()
        .default({})
        .describe(
          'Override context for the step execution. Use this to provide mock data for upstream step outputs, e.g. { "steps": { "previous_step": { "output": { "data": "mock" } } } }'
        ),
    }),
    tags: ['workflows', 'execution', 'step', 'debugging'],
    confirmation: {
      askUser: 'always',
    },
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ workflowYaml, stepId, contextOverride }, { spaceId, request }) => {
      try {
        const workflowExecutionId = await api.testStep(
          workflowYaml,
          stepId,
          contextOverride ?? {},
          spaceId,
          request
        );

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: true,
                workflowExecutionId,
                stepId,
                message: `Step "${stepId}" execution started. Use get_workflow_execution_status with executionId "${workflowExecutionId}" to check progress and see results.`,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: false,
                stepId,
                error: error instanceof Error ? error.message : String(error),
              },
            },
          ],
        };
      }
    },
  });
}
