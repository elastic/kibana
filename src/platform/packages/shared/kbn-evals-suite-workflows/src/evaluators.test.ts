/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTaskOutput } from './types';
import { createEditSuccessEvaluator, createEfficiencyEvaluator } from './evaluators';

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
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(1);
    expect(result.metadata.totalToolCalls).toBe(1);
  });

  it('scores 0.5 when half of workflow calls fail', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: false, error: 'error' }),
      toolCall('workflow_modify_step', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(0.5);
    expect(result.metadata.failedCalls).toBe(1);
  });

  it('excludes lookup calls from waste calculation', async () => {
    const output = mockOutput([
      toolCall('get_step_definitions', {}),
      toolCall('get_connectors', {}),
      toolCall('workflow_replace_yaml', { success: true }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(1);
    expect(result.metadata.lookupCalls).toBe(2);
    expect(result.metadata.totalToolCalls).toBe(3);
  });

  it('scores 0 when all workflow calls fail', async () => {
    const output = mockOutput([
      toolCall('workflow_modify_step', { success: false, error: 'error' }),
    ]);
    const result = await evaluator.evaluate({ output });
    expect(result.score).toBe(0);
    expect(result.metadata.failedCalls).toBe(1);
  });
});
