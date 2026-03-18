/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { getToolCallSteps } from '@kbn/evals';
import type { WorkflowEditExample, WorkflowCreateExample, WorkflowTaskOutput } from './types';

/**
 * Tool results from the converse API are ToolResult objects:
 * `{ tool_result_id, type: "other", data: { success, validation, ... } }`
 *
 * This helper unwraps the `data` field to get the actual tool handler payload.
 */
const unwrapToolResultData = (result: unknown): Record<string, unknown> | undefined => {
  if (typeof result !== 'object' || result === null) return undefined;
  const r = result as Record<string, unknown>;
  if (typeof r.data === 'object' && r.data !== null) {
    return r.data as Record<string, unknown>;
  }
  return r;
};

const getWorkflowEditResultData = (output: WorkflowTaskOutput): Array<Record<string, unknown>> => {
  const toolCalls = getToolCallSteps(output);
  return toolCalls
    .filter((t) => t.tool_id?.includes('workflow_'))
    .flatMap((t) => t.results ?? [])
    .map(unwrapToolResultData)
    .filter((d): d is Record<string, unknown> => d !== undefined);
};

export function createToolUsageEvaluator() {
  return {
    name: 'UsedExpectedTools',
    kind: 'CODE' as const,
    evaluate: async ({
      output,
      expected,
    }: {
      output: WorkflowTaskOutput;
      expected: WorkflowEditExample['output'] | WorkflowCreateExample['output'];
    }) => {
      const expectedToolIds = 'expectedToolIds' in expected ? expected.expectedToolIds : undefined;
      if (!expectedToolIds || expectedToolIds.length === 0) {
        return { score: 1 };
      }

      const toolCalls = getToolCallSteps(output);
      const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean) as string[];

      const allUsed = expectedToolIds.every((id) => usedToolIds.includes(id));
      return {
        score: allUsed ? 1 : 0,
        metadata: { expectedToolIds, usedToolIds },
      };
    },
  };
}

export function createEditSuccessEvaluator() {
  return {
    name: 'EditToolSuccess',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const editResults = getWorkflowEditResultData(output);

      if (editResults.length === 0) {
        return { score: 0, metadata: { reason: 'No workflow edit tool calls found' } };
      }

      const allSuccessful = editResults.every((r) => r.success === true);

      return {
        score: allSuccessful ? 1 : 0,
        metadata: {
          editResultCount: editResults.length,
          results: editResults.map((r) => ({
            success: r.success,
            error: r.error,
            toolId: r.toolId,
          })),
        },
      };
    },
  };
}

export function createValidationPassEvaluator() {
  return {
    name: 'ValidationPass',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const editResults = getWorkflowEditResultData(output);
      const lastEditResult = editResults[editResults.length - 1];

      if (!lastEditResult) {
        return { score: 0, metadata: { reason: 'No workflow edit results' } };
      }

      const validation = lastEditResult.validation as
        | { valid: boolean; errors?: string[] }
        | undefined;

      if (!validation) {
        return { score: 0.5, metadata: { reason: 'No validation result returned' } };
      }

      return {
        score: validation.valid ? 1 : 0,
        metadata: { validation },
      };
    },
  };
}

export function createNoErrorsEvaluator() {
  return {
    name: 'NoErrors',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const hasErrors = output.errors && output.errors.length > 0;
      return {
        score: hasErrors ? 0 : 1,
        metadata: { errorCount: output.errors?.length ?? 0 },
      };
    },
  };
}

export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
      metadata,
    }: {
      input: WorkflowEditExample['input'] | WorkflowCreateExample['input'];
      output: WorkflowTaskOutput;
      expected: WorkflowEditExample['output'] | WorkflowCreateExample['output'];
      metadata: WorkflowEditExample['metadata'] | WorkflowCreateExample['metadata'];
    }) => {
      const { criteria } = expected;
      if (!criteria || criteria.length === 0) {
        return { score: 1, label: 'PASS', explanation: 'No criteria specified.' };
      }
      return evaluators.criteria(criteria).evaluate({ input, expected, output, metadata });
    },
  };
}
