/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';
import type { DefaultEvaluators, Evaluator, Example } from '@kbn/evals';
import { getToolCallSteps, createTrajectoryEvaluator } from '@kbn/evals';
import { stableStringify } from '@kbn/std';
import { collectAllSteps } from '@kbn/workflows';
import type { Step, WorkflowYaml } from '@kbn/workflows';
import type {
  WorkflowEditExample,
  WorkflowCreateExample,
  WorkflowTaskOutput,
  StructuralExpectations,
  EfficiencyExpectations,
} from './types';

type WorkflowExample = WorkflowEditExample | WorkflowCreateExample;

const INFRA_ERROR_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'Not applicable: infrastructure error — not a model quality issue',
};

const NEGATIVE_CASE_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'Not applicable: negative case — model should reject this request',
};

const INFRA_ERROR_PATTERN =
  /timeout|ECONNREFUSED|503|502|500|401|ENOTFOUND|socket hang up|ERR_BAD_RESPONSE/i;

/**
 * Wraps an evaluator so it returns N/A when the conversation encountered an
 * infrastructure error (timeouts, connection refused, auth failures, etc.).
 * These are environment issues, not model quality problems.
 */
export function skipInfraErrors<TExample extends Example>(
  evaluator: Evaluator<TExample, WorkflowTaskOutput>
): Evaluator<TExample, WorkflowTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      const errors = (args.output as WorkflowTaskOutput)?.errors ?? [];
      const isInfra = errors.some((e) =>
        INFRA_ERROR_PATTERN.test(typeof e === 'string' ? e : JSON.stringify(e))
      );
      if (isInfra) {
        return INFRA_ERROR_NA;
      }
      return evaluator.evaluate(args);
    },
  };
}

/**
 * Wraps an evaluator so it returns N/A for negative-case examples (category === 'negative').
 * These are prompts where the model should refuse to generate a workflow, so
 * production-quality metrics are meaningless and should not skew averages.
 */
export function skipNegativeCases<TExample extends Example>(
  evaluator: Evaluator<TExample, WorkflowTaskOutput>
): Evaluator<TExample, WorkflowTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      const metadata = args.metadata as WorkflowExample['metadata'] | undefined;
      if (metadata?.category === 'negative') {
        return NEGATIVE_CASE_NA;
      }
      return evaluator.evaluate(args);
    },
  };
}

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
 * For `setYaml` calls, the YAML is available in `params.yaml`.
 * For granular edit tools (insert/modify/delete), the final YAML lives in
 * the attachment system — use {@link extractYamlFromAttachments} as a fallback.
 */
export const extractResultYaml = (output: WorkflowTaskOutput): string | undefined => {
  const steps = output.steps ?? [];
  const workflowToolSteps = steps
    .filter((s) => s.type === 'tool_call' && s.tool_id?.includes('workflow_'))
    .reverse();

  for (const step of workflowToolSteps) {
    if (step.tool_id?.includes('set_yaml') && typeof step.params?.yaml === 'string') {
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

/**
 * Scores whether the model correctly refused to generate a workflow for a negative case.
 * Returns N/A for positive cases since workflow generation is expected there.
 */
export function createRejectionEvaluator() {
  return {
    name: 'Rejection',
    kind: 'CODE' as const,
    evaluate: async ({
      output,
      metadata,
    }: {
      output: WorkflowTaskOutput;
      metadata: WorkflowExample['metadata'];
    }) => {
      if (metadata?.category !== 'negative') {
        return { score: null, label: 'N/A' as const, explanation: 'Not a negative case' };
      }
      const refused = !output.resultYaml;
      return {
        score: refused ? 1 : 0,
        label: refused ? ('PASS' as const) : ('FAIL' as const),
        explanation: refused
          ? 'Model correctly refused to generate a workflow'
          : 'Model incorrectly generated a workflow for a request it should have rejected',
      };
    },
  };
}

const parseWorkflowYaml = (yaml: string): { steps: Step[] } | undefined => {
  try {
    const parsed = parseYaml(yaml);
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }
    const workflow = parsed as Partial<WorkflowYaml>;
    const rawSteps = Array.isArray(workflow.steps) ? (workflow.steps as WorkflowYaml['steps']) : [];
    return { steps: collectAllSteps(rawSteps) };
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

      const checks: Array<{ name: string; pass: boolean; score?: number; detail: string }> = [];

      if (expectedStepCount !== undefined) {
        const count = workflow.steps.length;
        if (typeof expectedStepCount === 'number') {
          const diff = Math.abs(count - expectedStepCount);
          const stepScore = diff === 0 ? 1 : Math.max(0, 1 - diff / expectedStepCount);
          checks.push({
            name: 'stepCount',
            pass: stepScore >= 0.5,
            score: stepScore,
            detail: `expected ${expectedStepCount}, got ${count}`,
          });
        } else {
          let stepScore: number;
          if (count < expectedStepCount.min) {
            stepScore = expectedStepCount.min > 0 ? Math.max(0, count / expectedStepCount.min) : 0;
          } else if (count > expectedStepCount.max) {
            stepScore =
              expectedStepCount.max > 0
                ? Math.max(0, 1 - (count - expectedStepCount.max) / expectedStepCount.max)
                : 0;
          } else {
            stepScore = 1;
          }
          checks.push({
            name: 'stepCount',
            pass: stepScore >= 0.5,
            score: stepScore,
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

      const totalScore = checks.reduce((sum, c) => sum + (c.score ?? (c.pass ? 1 : 0)), 0);
      return {
        score: checks.length > 0 ? totalScore / checks.length : 1,
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

        const originalJson = stableStringify(originalStep);
        const resultJson = stableStringify(resultStep);
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

const LOOKUP_TOOL_PATTERNS = [
  'get_step_definitions',
  'get_connectors',
  'get_examples',
  'get_trigger_definitions',
];

const isLookupCall = (toolId: string | undefined): boolean =>
  LOOKUP_TOOL_PATTERNS.some((p) => toolId?.includes(p));

/**
 * Budget-based efficiency: tiered penalty when total tool calls exceed the budget.
 * Mirrors the approach used by kbn-evals-suite-streams's stepEfficiency.
 */
const calculateBudgetScore = (totalCalls: number, budget: number): number => {
  if (totalCalls <= budget) {
    return 1.0;
  }
  const overshoot = totalCalls / budget;
  if (overshoot <= 1.5) {
    return 0.7;
  }
  if (overshoot <= 2.0) {
    return 0.4;
  }
  return 0.1;
};

/**
 * Penalizes redundant lookups: calling the same lookup tool with the same
 * params more than once is wasteful. Calls with different params (e.g.
 * a broad search followed by a detailed schema fetch) are not redundant.
 */
const calculateRedundantLookupScore = (
  toolCalls: Array<{ tool_id?: string; params?: Record<string, unknown> }>
): { score: number; redundantCount: number; uniqueLookups: number } => {
  const lookups = toolCalls.filter((t) => isLookupCall(t.tool_id));
  if (lookups.length === 0) {
    return { score: 1, redundantCount: 0, uniqueLookups: 0 };
  }

  const seen = new Set<string>();
  for (const t of lookups) {
    const key = (t.tool_id ?? 'unknown') + '::' + JSON.stringify(t.params ?? {});
    seen.add(key);
  }

  const uniqueLookups = seen.size;
  const redundantCount = lookups.length - uniqueLookups;
  const score = redundantCount === 0 ? 1.0 : Math.max(0, 1 - redundantCount / lookups.length);

  return { score, redundantCount, uniqueLookups };
};

const FAILED_CALL_WEIGHT = 0.4;
const BUDGET_WEIGHT = 0.35;
const REDUNDANT_LOOKUP_WEIGHT = 0.25;

const DEFAULT_TOOL_CALL_BUDGET = 6;

export function createEfficiencyEvaluator() {
  return {
    name: 'Efficiency',
    kind: 'CODE' as const,
    evaluate: async ({
      output,
      expected,
    }: {
      output: WorkflowTaskOutput;
      expected: EfficiencyExpectations;
    }) => {
      const toolCalls = getToolCallSteps(output);
      const workflowCalls = toolCalls.filter((t) => t.tool_id?.includes('workflow_'));
      const failedCalls = workflowCalls.filter((t) =>
        t.results?.some((r) => {
          const data = unwrapToolResultData(r);
          return data && data.success === false;
        })
      );

      const totalToolCalls = toolCalls.length;
      const wastedCalls = failedCalls.length;

      const failedCallScore =
        totalToolCalls > 0 ? Math.max(0, 1 - wastedCalls / totalToolCalls) : 1;

      const budget = expected?.expectedMaxToolCalls ?? DEFAULT_TOOL_CALL_BUDGET;
      const budgetScore = calculateBudgetScore(totalToolCalls, budget);

      const {
        score: redundantScore,
        redundantCount,
        uniqueLookups,
      } = calculateRedundantLookupScore(toolCalls);

      const efficiency =
        FAILED_CALL_WEIGHT * failedCallScore +
        BUDGET_WEIGHT * budgetScore +
        REDUNDANT_LOOKUP_WEIGHT * redundantScore;

      return {
        score: Math.round(efficiency * 1000) / 1000,
        metadata: {
          totalToolCalls,
          workflowEditCalls: workflowCalls.length,
          failedCalls: wastedCalls,
          failedCallScore,
          budget,
          budgetScore,
          lookupCalls: toolCalls.filter((t) => isLookupCall(t.tool_id)).length,
          uniqueLookups,
          redundantLookups: redundantCount,
          redundantLookupScore: redundantScore,
        },
      };
    },
  };
}

export function createToolTrajectoryEvaluator() {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => {
      const steps = (output as WorkflowTaskOutput).steps ?? [];
      return steps.filter((s) => s.type === 'tool_call' && s.tool_id).map((s) => s.tool_id!);
    },
    goldenPathExtractor: (expected) => {
      const exp = expected as EfficiencyExpectations;
      return exp.expectedToolSequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    evaluate: async (args: Parameters<typeof inner.evaluate>[0]) => {
      const exp = args.expected as EfficiencyExpectations;
      if (!exp.expectedToolSequence) {
        return {
          score: null as null,
          label: 'N/A' as const,
          explanation: 'No expected tool sequence defined — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
}

/**
 * Wall-clock latency evaluator. Measures how long the task took and scores
 * proportionally: full marks at or under `maxSeconds`, degrading linearly above.
 */
export function createLatencyEvaluator({ maxSeconds = 60 }: { maxSeconds?: number } = {}) {
  return {
    name: 'Latency',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: WorkflowTaskOutput }) => {
      const { latencyMs } = output;
      if (latencyMs == null) {
        return { score: null, label: 'N/A' as const, metadata: { reason: 'No latency data' } };
      }
      const seconds = latencyMs / 1000;
      const score =
        seconds <= maxSeconds ? 1 : Math.max(0, 1 - (seconds - maxSeconds) / maxSeconds);
      return {
        score: Math.round(score * 1000) / 1000,
        metadata: { latencyMs, seconds, maxSeconds },
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

      const cleanInput: Record<string, string> = {
        instruction: input.instruction,
      };
      if ('initialYaml' in input) {
        cleanInput.initialYaml = input.initialYaml;
      }

      const isNegativeCase = metadata?.category === 'negative';

      if (isNegativeCase) {
        const responseText = output.messages?.map((m) => m.message).join('\n') ?? '';
        return evaluators.criteria(criteria).evaluate({
          input: cleanInput,
          expected,
          output: { response: responseText },
          metadata: undefined,
        });
      }

      if (!output.resultYaml) {
        return {
          score: 0,
          label: 'FAIL' as const,
          explanation: 'No result YAML produced — cannot evaluate criteria.',
        };
      }

      return evaluators.criteria(criteria).evaluate({
        input: cleanInput,
        expected,
        output: { resultYaml: output.resultYaml },
        metadata: undefined,
      });
    },
  };
}
