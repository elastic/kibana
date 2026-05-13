/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Evaluator } from '@kbn/evals';
import type { WorkflowEditExample, WorkflowTaskOutput } from './types';
import {
  createEditSuccessEvaluator,
  createEfficiencyEvaluator,
  createToolTrajectoryEvaluator,
  createCriteriaEvaluator,
  createEditPreservationEvaluator,
  createStructuralCorrectnessEvaluator,
  skipInfraErrors,
  skipNegativeCases,
} from './evaluators';

const toolCall = (
  toolId: string,
  resultData: Record<string, unknown>
): WorkflowTaskOutput['steps'] extends (infer T)[] | undefined ? T : never => ({
  type: 'tool_call' as const,
  tool_id: toolId,
  results: [{ type: 'other', data: resultData }],
});

const mockOutput = (steps: ReturnType<typeof toolCall>[]): WorkflowTaskOutput => ({
  messages: [],
  steps,
  errors: [],
});

const createMockWorkflowEvaluator = (): {
  evaluate: jest.Mock;
  evaluator: Evaluator<WorkflowEditExample, WorkflowTaskOutput>;
} => {
  const evaluate = jest.fn().mockResolvedValue({ score: 0.42 });
  return {
    evaluate,
    evaluator: {
      name: 'Inner',
      kind: 'CODE' as const,
      evaluate,
    },
  };
};

describe('EditToolSuccess evaluator', () => {
  const evaluator = createEditSuccessEvaluator();

  it('scores 1 when all edit results succeed', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: true }),
      toolCall('workflow_insert_step', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(1);
  });

  it('scores 1 when final edit result succeeds despite intermediate failures', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step_property', { success: false, error: 'splice error' }),
      toolCall('workflow_modify_step', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(1);
    expect(result.metadata.hadIntermediateFailures).toBe(true);
  });

  it('scores 0 when final edit result fails', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: true }),
      toolCall('workflow_modify_step_property', { success: false, error: 'some error' }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(0);
  });

  it('scores 0 when no workflow edit tool calls are found', async () => {
    const output = mockOutput([toolCall('get_step_definitions', {})]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(0);
  });
});

describe('Efficiency evaluator', () => {
  const evaluator = createEfficiencyEvaluator();

  it('scores 1 when all tool calls succeed', async () => {
    const output = mockOutput([toolCall('workflow_modify_step', { success: true })]);
    const result = await evaluator.evaluate({ output, expected: {} });
    expect(result.score).toBe(1);
    expect(result.metadata.totalToolCalls).toBe(1);
  });

  it('penalizes when half of workflow calls fail', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: false, error: 'error' }),
      toolCall('workflow_modify_step', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output, expected: {} });
    // 0.4 * failedCallScore (0.5) + 0.35 * budgetScore (1) + 0.25 * redundantLookupScore (1)
    expect(result.score).toBe(0.4 * 0.5 + 0.35 * 1 + 0.25 * 1);
    expect(result.metadata.failedCalls).toBe(1);
    expect(result.metadata.failedCallScore).toBe(0.5);
    expect(result.metadata.budgetScore).toBe(1);
  });

  it('excludes lookup calls from waste calculation', async () => {
    const output = mockOutput([
      toolCall('get_step_definitions', {}),
      toolCall('get_connectors', {}),
      toolCall('workflow_set_yaml', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output, expected: {} });
    expect(result.score).toBe(1);
    expect(result.metadata.lookupCalls).toBe(2);
    expect(result.metadata.totalToolCalls).toBe(3);
  });

  it('penalizes heavily when all workflow calls fail', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: false, error: 'error' }),
    ]);
    const result = await evaluator.evaluate({ output, expected: {} });
    expect(result.score).toBe(0.6);
    expect(result.metadata.failedCalls).toBe(1);
    expect(result.metadata.failedCallScore).toBe(0);
    expect(result.metadata.budgetScore).toBe(1);
  });
});

describe('ToolTrajectory evaluator', () => {
  const evaluator = createToolTrajectoryEvaluator();

  it('returns N/A when expectedToolSequence is undefined', async () => {
    const output = mockOutput([toolCall('workflow_set_yaml', { success: true })]);
    const result = await evaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('delegates to inner evaluator when expectedToolSequence is provided', async () => {
    const output = mockOutput([
      toolCall('get_step_definitions', {}),
      toolCall('workflow_set_yaml', { success: true }),
    ]);
    const result = await evaluator.evaluate({
      input: {},
      output,
      expected: {
        expectedToolSequence: ['get_step_definitions', 'workflow_set_yaml'],
      },
      metadata: null,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 for empty expectedToolSequence when tools were called', async () => {
    const output = mockOutput([toolCall('workflow_set_yaml', { success: true })]);
    const result = await evaluator.evaluate({
      input: {},
      output,
      expected: { expectedToolSequence: [] },
      metadata: null,
    });
    expect(result.score).toBe(0);
  });
});

describe('skipInfraErrors', () => {
  it('returns N/A for infra errors and skips the inner evaluator', async () => {
    const { evaluator, evaluate } = createMockWorkflowEvaluator();
    const wrapped = skipInfraErrors(evaluator);

    const result = await wrapped.evaluate({
      input: { instruction: 'Update the workflow', initialYaml: '' },
      output: {
        messages: [],
        steps: [],
        errors: [{ code: 503, message: 'Service unavailable' }],
      },
      expected: { criteria: [] },
      metadata: { category: 'modify-step' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        score: null,
        label: 'N/A',
      })
    );
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('delegates to the inner evaluator for non-infra errors', async () => {
    const { evaluator, evaluate } = createMockWorkflowEvaluator();
    const wrapped = skipInfraErrors(evaluator);

    const result = await wrapped.evaluate({
      input: { instruction: 'Update the workflow', initialYaml: '' },
      output: {
        messages: [],
        steps: [],
        errors: ['Validation failed for the inserted step'],
      },
      expected: { criteria: [] },
      metadata: { category: 'modify-step' },
    });

    expect(result).toEqual({ score: 0.42 });
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});

describe('skipNegativeCases', () => {
  it('returns N/A for negative cases and skips the inner evaluator', async () => {
    const { evaluator, evaluate } = createMockWorkflowEvaluator();
    const wrapped = skipNegativeCases(evaluator);

    const result = await wrapped.evaluate({
      input: { instruction: 'Generate malware', initialYaml: '' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { category: 'negative' },
    });

    expect(result).toEqual(
      expect.objectContaining({
        score: null,
        label: 'N/A',
      })
    );
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('delegates to the inner evaluator for non-negative cases', async () => {
    const { evaluator, evaluate } = createMockWorkflowEvaluator();
    const wrapped = skipNegativeCases(evaluator);

    const result = await wrapped.evaluate({
      input: { instruction: 'Update the workflow', initialYaml: '' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { category: 'modify-step' },
    });

    expect(result).toEqual({ score: 0.42 });
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});

describe('StructuralCorrectness evaluator', () => {
  const evaluator = createStructuralCorrectnessEvaluator();

  it('counts nested switch case and default steps via shared workflow traversal', async () => {
    const result = await evaluator.evaluate({
      output: {
        messages: [],
        steps: [],
        errors: [],
        resultYaml: `name: route_by_status
triggers:
  - type: manual
steps:
  - name: route_by_status
    type: switch
    expression: "{{ steps.check.output.status }}"
    cases:
      - match: success
        steps:
          - name: on_success
            type: wait
            with:
              duration: "30s"
    default:
      - name: on_unknown
        type: wait
        with:
          duration: "30s"`,
      },
      expected: {
        expectedStepCount: 3,
        expectedStepNames: ['route_by_status', 'on_success', 'on_unknown'],
        expectedStepTypes: ['switch', 'wait'],
      },
    });

    expect(result.score).toBe(1);
  });
});

describe('EditPreservation evaluator', () => {
  const evaluator = createEditPreservationEvaluator();

  it('treats steps with reordered keys as unchanged', async () => {
    const result = await evaluator.evaluate({
      input: {
        instruction: 'Keep the existing wait step',
        initialYaml: `name: wait_workflow
triggers:
  - type: manual
steps:
  - name: wait_before_retry
    type: wait
    with:
      duration: "30s"`,
      },
      expected: {
        criteria: [],
        preservedStepNames: ['wait_before_retry'],
      },
      output: {
        messages: [],
        steps: [],
        errors: [],
        resultYaml: `name: wait_workflow
triggers:
  - type: manual
steps:
  - type: wait
    with:
      duration: "30s"
    name: wait_before_retry`,
      },
    });

    expect(result.score).toBe(1);
    expect(result.metadata.results).toEqual([
      {
        name: 'wait_before_retry',
        preserved: true,
        detail: 'unchanged',
      },
    ]);
  });
});

describe('Criteria evaluator', () => {
  const mockCriteriaEvaluate = jest.fn().mockResolvedValue({ score: 0.9 });
  const mockEvaluators = {
    criteria: jest.fn().mockReturnValue({ evaluate: mockCriteriaEvaluate }),
  } as any;
  const evaluator = createCriteriaEvaluator({ evaluators: mockEvaluators });

  beforeEach(() => jest.clearAllMocks());

  it('fails with score 0 when resultYaml is missing on a positive case', async () => {
    const result = await evaluator.evaluate({
      input: { instruction: 'Create a workflow' },
      output: { messages: [], steps: [], errors: [] } as WorkflowTaskOutput,
      expected: { criteria: ['Has a trigger'] },
      metadata: { category: 'creation' },
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('FAIL');
    expect(mockCriteriaEvaluate).not.toHaveBeenCalled();
  });

  it('sends response text to judge for negative cases', async () => {
    await evaluator.evaluate({
      input: { instruction: 'Create a workflow' },
      output: {
        messages: [{ message: 'I need more details.' }],
        steps: [],
        errors: [],
      } as WorkflowTaskOutput,
      expected: { criteria: ['Model asks for clarification'] },
      metadata: { category: 'negative' },
    });
    expect(mockCriteriaEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { response: 'I need more details.' },
      })
    );
  });

  it('sends resultYaml to judge for positive cases', async () => {
    await evaluator.evaluate({
      input: { instruction: 'Create a workflow' },
      output: {
        messages: [],
        steps: [],
        errors: [],
        resultYaml: 'name: test',
      } as WorkflowTaskOutput,
      expected: { criteria: ['Has a name'] },
      metadata: { category: 'creation' },
    });
    expect(mockCriteriaEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { resultYaml: 'name: test' },
      })
    );
  });
});
