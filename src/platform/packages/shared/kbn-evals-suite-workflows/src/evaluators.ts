/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';
import type { DefaultEvaluators } from '@kbn/evals';
import { getToolCallSteps } from '@kbn/evals';
import type {
  WorkflowEditExample,
  WorkflowCreateExample,
  WorkflowTaskOutput,
  StructuralExpectations,
} from './types';

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

const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

/**
 * Extract the resulting workflow YAML from tool call steps.
 *
 * For `replaceYaml` calls, the YAML is available in `params.yaml`.
 * For granular edit tools (insert/modify/delete), the final YAML lives in
 * the attachment system — use {@link extractYamlFromAttachments} as a fallback.
 */
export const extractResultYaml = (output: WorkflowTaskOutput): string | undefined => {
  const steps = output.steps ?? [];
  const workflowToolSteps = steps
    .filter((s) => s.type === 'tool_call' && s.tool_id?.includes('workflow_'))
    .reverse();

  for (const step of workflowToolSteps) {
    if (step.tool_id?.includes('replace_yaml') && typeof step.params?.yaml === 'string') {
      const resultData = (step.results ?? []).map(unwrapToolResultData).filter(Boolean);
      const lastResult = resultData[resultData.length - 1];
      if (lastResult?.success === true) {
        return step.params.yaml;
      }
    }
  }

  return undefined;
};

/**
 * Extract the workflow YAML from versioned conversation attachments.
 * Finds the `workflow.yaml` attachment and reads its current version's data.
 */
export const extractYamlFromAttachments = (
  attachments: Array<{
    type: string;
    current_version: number;
    versions: Array<{ version: number; data: Record<string, unknown> }>;
  }>
): string | undefined => {
  const workflowAttachment = attachments.find((a) => a.type === WORKFLOW_YAML_ATTACHMENT_TYPE);
  if (!workflowAttachment) return undefined;

  const currentVersion = workflowAttachment.versions.find(
    (v) => v.version === workflowAttachment.current_version
  );
  if (!currentVersion) return undefined;

  const { yaml } = currentVersion.data as { yaml?: string };
  return typeof yaml === 'string' ? yaml : undefined;
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

const SCORE_ON_FINAL_RESULT = true;

export function createEditSuccessEvaluator() {
  return {
    name: 'EditToolSuccess',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const editResults = getWorkflowEditResultData(output);

      if (editResults.length === 0) {
        return { score: 0, metadata: { reason: 'No workflow edit tool calls found' } };
      }

      if (SCORE_ON_FINAL_RESULT) {
        const lastResult = editResults[editResults.length - 1];
        const finalSuccess = lastResult.success === true;
        const hadIntermediateFailures = editResults.slice(0, -1).some((r) => r.success === false);

        return {
          score: finalSuccess ? 1 : 0,
          metadata: {
            editResultCount: editResults.length,
            hadIntermediateFailures,
            results: editResults.map((r) => ({
              success: r.success,
              error: r.error,
              toolId: r.toolId,
            })),
          },
        };
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
        return { score: 0, metadata: { reason: 'No validation result returned' } };
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

interface ParsedStep {
  name?: string;
  type?: string;
  [key: string]: unknown;
}

const collectSteps = (steps: unknown[]): ParsedStep[] => {
  const result: ParsedStep[] = [];
  for (const step of steps) {
    if (typeof step !== 'object' || step === null) continue;
    const s = step as Record<string, unknown>;
    result.push(s as ParsedStep);
    if (Array.isArray(s.then)) result.push(...collectSteps(s.then));
    if (Array.isArray(s.else)) result.push(...collectSteps(s.else));
    if (Array.isArray(s.do)) result.push(...collectSteps(s.do));
    if (Array.isArray(s.steps)) result.push(...collectSteps(s.steps));
  }
  return result;
};

const parseWorkflowYaml = (
  yaml: string
): { steps: ParsedStep[]; parsed: Record<string, unknown> } | undefined => {
  try {
    const parsed = parseYaml(yaml) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
    return { steps: collectSteps(rawSteps), parsed };
  } catch {
    return undefined;
  }
};

export function createStructuralCorrectnessEvaluator() {
  return {
    name: 'StructuralCorrectness',
    kind: 'CODE' as const,
    evaluate: async ({
      output,
      expected,
    }: {
      output: WorkflowTaskOutput;
      expected: StructuralExpectations;
    }) => {
      const { expectedStepCount, expectedStepTypes, expectedStepNames } = expected;

      const hasAnyExpectation =
        expectedStepCount !== undefined ||
        (expectedStepTypes && expectedStepTypes.length > 0) ||
        (expectedStepNames && expectedStepNames.length > 0);

      if (!hasAnyExpectation) {
        return { score: 1, metadata: { reason: 'No structural expectations defined' } };
      }

      if (!output.resultYaml) {
        return { score: 0, metadata: { reason: 'No result YAML available for structural check' } };
      }

      const workflow = parseWorkflowYaml(output.resultYaml);
      if (!workflow) {
        return { score: 0, metadata: { reason: 'Failed to parse result YAML' } };
      }

      const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

      if (expectedStepCount !== undefined) {
        const count = workflow.steps.length;
        if (typeof expectedStepCount === 'number') {
          const pass = count === expectedStepCount;
          checks.push({
            name: 'stepCount',
            pass,
            detail: `expected ${expectedStepCount}, got ${count}`,
          });
        } else {
          const pass = count >= expectedStepCount.min && count <= expectedStepCount.max;
          checks.push({
            name: 'stepCount',
            pass,
            detail: `expected ${expectedStepCount.min}-${expectedStepCount.max}, got ${count}`,
          });
        }
      }

      if (expectedStepTypes && expectedStepTypes.length > 0) {
        const actualTypes = new Set(workflow.steps.map((s) => s.type).filter(Boolean));
        for (const requiredType of expectedStepTypes) {
          const alternatives = requiredType.split('|');
          const pass = alternatives.some((alt) => actualTypes.has(alt));
          checks.push({
            name: `stepType:${alternatives[0]}`,
            pass,
            detail: pass ? 'present' : `missing (found: ${[...actualTypes].join(', ')})`,
          });
        }
      }

      if (expectedStepNames && expectedStepNames.length > 0) {
        const actualNames = new Set(workflow.steps.map((s) => s.name).filter(Boolean));
        for (const requiredName of expectedStepNames) {
          const pass = actualNames.has(requiredName);
          checks.push({
            name: `stepName:${requiredName}`,
            pass,
            detail: pass ? 'present' : `missing (found: ${[...actualNames].join(', ')})`,
          });
        }
      }

      const passed = checks.filter((c) => c.pass).length;
      return {
        score: checks.length > 0 ? passed / checks.length : 1,
        metadata: { checks },
      };
    },
  };
}

export function createEditPreservationEvaluator() {
  return {
    name: 'EditPreservation',
    kind: 'CODE' as const,
    evaluate: async ({
      input,
      output,
      expected,
    }: {
      input: WorkflowEditExample['input'];
      output: WorkflowTaskOutput;
      expected: WorkflowEditExample['output'];
    }) => {
      const preservedStepNames = expected.preservedStepNames;
      if (!preservedStepNames || preservedStepNames.length === 0) {
        return { score: 1, metadata: { reason: 'No preserved steps specified' } };
      }

      if (!output.resultYaml) {
        return {
          score: 0,
          metadata: { reason: 'No result YAML available for preservation check' },
        };
      }

      const before = parseWorkflowYaml(input.initialYaml);
      const after = parseWorkflowYaml(output.resultYaml);

      if (!before || !after) {
        return { score: 0, metadata: { reason: 'Failed to parse YAML for comparison' } };
      }

      const beforeStepsByName = new Map(before.steps.filter((s) => s.name).map((s) => [s.name, s]));
      const afterStepsByName = new Map(after.steps.filter((s) => s.name).map((s) => [s.name, s]));

      const results: Array<{ name: string; preserved: boolean; detail: string }> = [];
      for (const name of preservedStepNames) {
        const originalStep = beforeStepsByName.get(name);
        const resultStep = afterStepsByName.get(name);

        if (!originalStep) {
          results.push({ name, preserved: true, detail: 'not in original (skip)' });
          continue;
        }
        if (!resultStep) {
          results.push({ name, preserved: false, detail: 'missing from result' });
          continue;
        }

        const originalJson = JSON.stringify(originalStep);
        const resultJson = JSON.stringify(resultStep);
        const match = originalJson === resultJson;
        results.push({
          name,
          preserved: match,
          detail: match ? 'unchanged' : 'modified',
        });
      }

      const preserved = results.filter((r) => r.preserved).length;
      return {
        score: results.length > 0 ? preserved / results.length : 1,
        metadata: { results },
      };
    },
  };
}

export function createEfficiencyEvaluator() {
  return {
    name: 'Efficiency',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const toolCalls = getToolCallSteps(output);
      const workflowCalls = toolCalls.filter((t) => t.tool_id?.includes('workflow_'));
      const failedCalls = workflowCalls.filter((t) =>
        t.results?.some((r) => {
          const data = unwrapToolResultData(r);
          return data && data.success === false;
        })
      );
      const lookupCalls = toolCalls.filter(
        (t) =>
          t.tool_id?.includes('get_step_definitions') ||
          t.tool_id?.includes('get_connectors') ||
          t.tool_id?.includes('get_examples')
      );

      const totalToolCalls = toolCalls.length;
      const wastedCalls = failedCalls.length;
      const efficiency = totalToolCalls > 0 ? Math.max(0, 1 - wastedCalls / totalToolCalls) : 1;

      return {
        score: efficiency,
        metadata: {
          totalToolCalls,
          workflowEditCalls: workflowCalls.length,
          failedCalls: wastedCalls,
          lookupCalls: lookupCalls.length,
        },
      };
    },
  };
}

/**
 * Build a clean representation for the LLM judge instead of sending the
 * full conversation blob. Separates instruction, initial YAML (for edits),
 * and the resulting YAML so the judge can evaluate the actual workflow state.
 */
export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({
      input,
      output,
      expected,
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

      const cleanInput: Record<string, string> = {
        instruction: input.instruction,
      };
      if ('initialYaml' in input) {
        cleanInput.initialYaml = input.initialYaml;
      }

      const cleanOutput = output.resultYaml ? { resultYaml: output.resultYaml } : output;

      return evaluators.criteria(criteria).evaluate({
        input: cleanInput,
        expected,
        output: cleanOutput,
        metadata: undefined,
      });
    },
  };
}
