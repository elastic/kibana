/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';

export const GET_WORKFLOW_EXECUTION_STATUS_TOOL_ID =
  'platform.workflows.get_workflow_execution_status';

export function registerGetWorkflowExecutionStatusTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: GET_WORKFLOW_EXECUTION_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description: `Get the current status and results of a workflow execution.

**When to use:** After starting a workflow execution with execute_workflow or execute_workflow_step,
use this tool to poll for the execution status and retrieve results once complete.

Returns the execution status, step execution details, errors, and timing information.
If the execution is still running, call this tool again after a short wait.`,
    schema: z.object({
      executionId: z
        .string()
        .describe('The workflow execution ID returned by execute_workflow or execute_workflow_step'),
      includeOutput: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include step output data in the response'),
    }),
    tags: ['workflows', 'execution', 'status'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ executionId, includeOutput }, { spaceId }) => {
      try {
        const execution = await api.getWorkflowExecution(executionId, spaceId, {
          includeInput: false,
          includeOutput: includeOutput ?? true,
        });

        if (!execution) {
          return {
            results: [
              {
                type: 'other' as const,
                data: {
                  error: `Workflow execution "${executionId}" not found`,
                },
              },
            ],
          };
        }

        const isTerminal = TerminalExecutionStatuses.includes(
          execution.status as (typeof TerminalExecutionStatuses)[number]
        );

        const stepSummaries = execution.stepExecutions.map((step) => ({
          stepId: step.stepId,
          stepType: step.stepType,
          status: step.status,
          startedAt: step.startedAt,
          finishedAt: step.finishedAt,
          executionTimeMs: step.executionTimeMs,
          error: step.error,
          output: includeOutput ? step.output : undefined,
        }));

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executionId: execution.id,
                status: execution.status,
                isComplete: isTerminal,
                workflowId: execution.workflowId,
                workflowName: execution.workflowName,
                isTestRun: execution.isTestRun,
                startedAt: execution.startedAt,
                finishedAt: execution.finishedAt,
                duration: execution.duration,
                error: execution.error,
                stepExecutions: stepSummaries,
                ...(isTerminal
                  ? {}
                  : {
                      hint: 'Execution is still in progress. Call this tool again to check for updates.',
                    }),
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
                error: error instanceof Error ? error.message : String(error),
              },
            },
          ],
        };
      }
    },
  });
}
