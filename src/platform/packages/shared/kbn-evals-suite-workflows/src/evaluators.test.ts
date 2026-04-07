/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTaskOutput } from './types';
import {
  createEditSuccessEvaluator,
  createEfficiencyEvaluator,
  createToolTrajectoryEvaluator,
  createCriteriaEvaluator,
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
    expect(result.score).toBe(0.8);
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
