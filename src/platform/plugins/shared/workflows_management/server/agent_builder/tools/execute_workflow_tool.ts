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

export const EXECUTE_WORKFLOW_TOOL_ID = 'platform.workflows.execute_workflow';

export function registerExecuteWorkflowTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: EXECUTE_WORKFLOW_TOOL_ID,
    type: ToolType.builtin,
    description: `Execute a workflow as a test run. You can execute by workflow ID (runs a saved workflow) or by providing inline YAML (runs an ad-hoc workflow).

**When to use:** When the user wants to run/test/execute a workflow and see the results.
**Human confirmation:** This tool requires explicit user confirmation before execution because it performs real actions (API calls, notifications, data writes, etc.).

Returns a workflow execution ID that can be used with get_workflow_execution_status to poll for results.`,
    schema: z.object({
      workflowId: z
        .string()
        .optional()
        .describe('ID of a saved workflow to execute. Use list_workflows to find IDs.'),
      workflowYaml: z
        .string()
        .optional()
        .describe(
          'Complete inline workflow YAML to execute. Use this for ad-hoc or newly created workflows.'
        ),
      inputs: z
        .record(z.string(), z.any())
        .optional()
        .default({})
        .describe(
          'Input parameters for the workflow execution. For alert-triggered workflows, include event data here.'
        ),
    }),
    tags: ['workflows', 'execution'],
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
    handler: async ({ workflowId, workflowYaml, inputs }, { spaceId, request }) => {
      if (!workflowId && !workflowYaml) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: false,
                error: "Either 'workflowId' or 'workflowYaml' must be provided",
              },
            },
          ],
        };
      }

      try {
        const workflowExecutionId = await api.testWorkflow({
          workflowId,
          workflowYaml,
          inputs: inputs ?? {},
          spaceId,
          request,
        });

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: true,
                workflowExecutionId,
                message: `Workflow execution started. Use get_workflow_execution_status with executionId "${workflowExecutionId}" to check progress and see results.`,
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
                error: error instanceof Error ? error.message : String(error),
              },
            },
          ],
        };
      }
    },
  });
}
