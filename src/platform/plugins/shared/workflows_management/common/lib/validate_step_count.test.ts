/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { validateStepCount } from './validate_step_count';

const makeSteps = (count: number): WorkflowYaml['steps'] =>
  Array.from({ length: count }, (_, i) => ({
    name: `step_${i}`,
    type: 'data.set' as any,
    with: { payload: 'x' },
  }));

const makeWorkflow = (
  stepCount: number,
  settings?: Record<string, unknown>
): WorkflowYaml =>
  ({
    name: 'test-workflow',
    triggers: [{ type: 'manual' }],
    steps: makeSteps(stepCount),
    settings,
  } as unknown as WorkflowYaml);

describe('validateStepCount', () => {
  it('should pass for a small workflow', () => {
    const result = validateStepCount(makeWorkflow(10));
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass at exactly the default limit (150)', () => {
    const result = validateStepCount(makeWorkflow(150));
    expect(result.isValid).toBe(true);
  });

  it('should fail when exceeding the default limit (150)', () => {
    const result = validateStepCount(makeWorkflow(151));
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].count).toBe(151);
    expect(result.errors[0].maxSteps).toBe(150);
    expect(result.errors[0].message).toContain('exceeds the maximum of 150 steps');
  });

  it('should respect a custom max-steps setting', () => {
    const result = validateStepCount(makeWorkflow(11, { 'max-steps': 10 }));
    expect(result.isValid).toBe(false);
    expect(result.errors[0].maxSteps).toBe(10);
  });

  it('should pass when under a custom max-steps setting', () => {
    const result = validateStepCount(makeWorkflow(200, { 'max-steps': 500 }));
    expect(result.isValid).toBe(true);
  });

  it('should count steps inside foreach', () => {
    const workflow = {
      name: 'test',
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'loop',
          type: 'foreach',
          foreach: '{{ items }}',
          steps: [
            { name: 'inner_1', type: 'data.set', with: { payload: 'x' } },
            { name: 'inner_2', type: 'data.set', with: { payload: 'y' } },
          ],
        },
      ],
      settings: { 'max-steps': 2 },
    } as unknown as WorkflowYaml;

    const result = validateStepCount(workflow);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].count).toBeGreaterThan(2);
  });
});
