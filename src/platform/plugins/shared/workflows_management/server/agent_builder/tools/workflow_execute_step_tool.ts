/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import type { StepInfo, WorkflowLookup } from '../../../common/lib/yaml';
import { buildWorkflowLookup } from '../../../common/lib/yaml';
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

const buildLookup = (yaml: string): WorkflowLookup => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter });
  return buildWorkflowLookup(doc, lineCounter);
};

/**
 * Collects all descendant step IDs of a given step using parentStepId links.
 */
const getDescendantStepIds = (stepId: string, allSteps: Record<string, StepInfo>): string[] => {
  const descendants: string[] = [];
  for (const [id, info] of Object.entries(allSteps)) {
    if (info.parentStepId === stepId) {
      descendants.push(id);
      descendants.push(...getDescendantStepIds(id, allSteps));
    }
  }
  return descendants;
};

/**
 * A step is safe only if its own type and every descendant's type are in SAFE_STEP_TYPES.
 * Returns the first unsafe step found (self or descendant), or null if fully safe.
 */
const findUnsafeStep = (stepId: string, allSteps: Record<string, StepInfo>): StepInfo | null => {
  const step = allSteps[stepId];
  if (!step) return null;

  if (!SAFE_STEP_TYPES.has(step.stepType)) return step;

  const descendantIds = getDescendantStepIds(stepId, allSteps);
  for (const id of descendantIds) {
    const descendant = allSteps[id];
    if (descendant && !SAFE_STEP_TYPES.has(descendant.stepType)) {
      return descendant;
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

      const lookup = buildLookup(yaml);
      const stepInfo = lookup.steps[stepName];
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

      const unsafeStep = findUnsafeStep(stepName, lookup.steps);

      if (unsafeStep) {
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

        const isChildUnsafe = unsafeStep.stepId !== stepName;
        const reason = isChildUnsafe
          ? `Step "${stepName}" contains child step "${unsafeStep.stepId}" (type "${unsafeStep.stepType}") which has external side effects`
          : `Step type "${unsafeStep.stepType}" has external side effects and cannot be auto-executed`;

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                blocked: true,
                reason,
                stepType: stepInfo.stepType,
                unsafeStepType: unsafeStep.stepType,
                ...(isChildUnsafe ? { unsafeChildStepId: unsafeStep.stepId } : {}),
                ...(validation ? { validation } : {}),
                hint: 'Ask the user to test this step manually using the "Run step" button in the editor.',
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
