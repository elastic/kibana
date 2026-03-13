/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import { parseYamlToJSONWithoutValidation } from '../../../common/lib/yaml';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const WORKFLOW_EXECUTE_STEP_TOOL_ID = 'platform.workflows.workflow_execute_step';

const SAFE_STEP_TYPES = new Set([
  'console',
  'data.set',
  'data.map',
  'data.filter',
  'data.find',
  'data.dedupe',
  'data.aggregate',
  'data.concat',
  'data.parseJson',
  'data.regexExtract',
  'data.regexReplace',
  'data.stringifyJson',
  'data.transform',
  'if',
  'foreach',
  'while',
  'wait',
  'elasticsearch.search',
  'elasticsearch.esql.query',
  'elasticsearch.indices.exists',
  'kibana.get_case',
  'kibana.streams_list',
  'kibana.streams_get',
  'kibana.streams_get_significant_events',
]);

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 30_000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const findWorkflowYamlAttachment = (
  context: ToolHandlerContext
): { yaml: string; workflowId?: string } | null => {
  const activeAttachments = context.attachments.getActive();
  const yamlAttachment = activeAttachments.find((a) => a.type === WORKFLOW_YAML_ATTACHMENT_TYPE);
  if (!yamlAttachment) return null;

  const latestVersion = yamlAttachment.versions[yamlAttachment.versions.length - 1];
  if (!latestVersion) return null;

  const data = latestVersion.data as { yaml?: string; workflowId?: string };
  if (!data?.yaml) return null;

  return { yaml: data.yaml, workflowId: data.workflowId };
};

interface StepInfo {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

const findStepByName = (yaml: string, stepName: string): StepInfo | null => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success) return null;

  const steps = parsed.json?.steps;
  if (!Array.isArray(steps)) return null;

  for (const step of steps) {
    if (step && typeof step === 'object' && step.name === stepName) {
      return {
        name: step.name as string,
        type: (step.type as string) ?? 'unknown',
        config: step as Record<string, unknown>,
      };
    }
  }
  return null;
};

const pollExecution = async (
  api: WorkflowsManagementApi,
  executionId: string,
  stepName: string,
  spaceId: string
): Promise<{
  status: string;
  output?: unknown;
  error?: unknown;
  duration?: number | null;
}> => {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    await delay(POLL_INTERVAL_MS);

    const execution = await api.getWorkflowExecution(executionId, spaceId, {
      includeOutput: true,
    });

    if (!execution) {
      return { status: 'not_found', error: `Execution ${executionId} not found` };
    }

    if (TerminalExecutionStatuses.includes(execution.status as ExecutionStatus)) {
      const targetStepExecution = execution.stepExecutions?.find((se) => se.stepId === stepName);

      return {
        status: execution.status,
        output: targetStepExecution ?? undefined,
        error: execution.error ?? undefined,
        duration: execution.duration,
      };
    }
  }

  return {
    status: 'timeout',
    error: `Step execution did not complete within ${
      POLL_TIMEOUT_MS / 1000
    }s. The execution may still be running.`,
  };
};

export function registerWorkflowExecuteStepTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: WORKFLOW_EXECUTE_STEP_TOOL_ID,
    type: ToolType.builtin,
    description: `Execute a single workflow step to verify it works correctly.
Safe steps (data transforms, read-only ES queries, console, conditionals) are executed automatically and their output is returned.
Unsafe steps (HTTP calls, index writes, connector actions, AI prompts) are blocked — a preview with the step config and validation result is returned instead.
Use this tool AFTER editing a step to verify your changes produce the expected result.
Provide contextOverride with mock data when the step references outputs from previous steps.`,
    schema: z.object({
      stepName: z.string().describe('Name of the step to execute'),
      contextOverride: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Mock data for upstream step outputs, e.g. { "steps": { "prev_step": { "output": { "data": [...] } } } }'
        ),
    }),
    tags: ['workflows', 'yaml', 'execution', 'testing'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ stepName, contextOverride }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: false,
                error: 'No workflow YAML attachment found in the conversation',
              },
            },
          ],
        };
      }

      const { yaml } = attachment;

      const stepInfo = findStepByName(yaml, stepName);
      if (!stepInfo) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: false,
                error: `Step "${stepName}" not found in the workflow YAML`,
              },
            },
          ],
        };
      }

      const isSafe = SAFE_STEP_TYPES.has(stepInfo.type);

      if (!isSafe) {
        let validation: { valid: boolean; errors?: string[] } | undefined;
        try {
          const result = await api.validateWorkflow(yaml, context.spaceId, context.request);
          if (result.valid) {
            validation = { valid: true };
          } else {
            const errors = result.diagnostics
              .filter((d) => d.severity === 'error')
              .map((d) => `[${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`);
            validation = { valid: false, errors };
          }
        } catch {
          // validation unavailable
        }

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                blocked: true,
                reason: `Step type "${stepInfo.type}" has external side effects and cannot be auto-executed`,
                stepType: stepInfo.type,
                stepConfig: stepInfo.config,
                ...(validation ? { validation } : {}),
                hint: 'The step configuration is shown above. Ask the user to test it manually using the "Run step" button in the editor.',
              },
            },
          ],
        };
      }

      try {
        const executionId = await api.testStep(
          yaml,
          stepName,
          contextOverride ?? {},
          context.spaceId,
          context.request
        );

        const result = await pollExecution(api, executionId, stepName, context.spaceId);

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: result.status === ExecutionStatus.COMPLETED,
                executionId,
                status: result.status,
                ...(result.output !== undefined ? { output: result.output } : {}),
                ...(result.error !== undefined ? { error: result.error } : {}),
                ...(result.duration != null ? { duration: result.duration } : {}),
              },
            },
          ],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: false,
                error: message,
              },
            },
          ],
        };
      }
    },
  });
}
