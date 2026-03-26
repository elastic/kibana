/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStepByNameFromNestedSteps } from './definition_utils';
import type { Step } from '../spec/schema';

const waitStep = (name: string): Step =>
  ({ name, type: 'wait', duration: '1s' } as unknown as Step);

describe('getStepByNameFromNestedSteps', () => {
  it('finds a top-level step by name', () => {
    const steps = [waitStep('step1'), waitStep('step2')];
    expect(getStepByNameFromNestedSteps(steps, 'step1')).toBe(steps[0]);
  });

  it('returns null when step is not found', () => {
    const steps = [waitStep('step1')];
    expect(getStepByNameFromNestedSteps(steps, 'nonexistent')).toBeNull();
  });

  it('returns null for empty steps array', () => {
    expect(getStepByNameFromNestedSteps([], 'step1')).toBeNull();
  });

  it('finds step nested inside foreach.steps', () => {
    const nested = waitStep('inner');
    const steps = [
      { name: 'loop', type: 'foreach', foreach: '{{ items }}', steps: [nested] },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'inner')).toBe(nested);
  });

  it('finds step inside if.steps (then branch)', () => {
    const nested = waitStep('in-then');
    const steps = [
      { name: 'check', type: 'if', condition: 'true', steps: [nested] },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-then')).toBe(nested);
  });

  it('finds step inside if.else (else branch)', () => {
    const nested = waitStep('in-else');
    const steps = [
      {
        name: 'check',
        type: 'if',
        condition: 'false',
        steps: [waitStep('in-then')],
        else: [nested],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-else')).toBe(nested);
  });

  it('finds step inside parallel.branches', () => {
    const nested = waitStep('in-branch');
    const steps = [
      {
        name: 'par',
        type: 'parallel',
        branches: [
          { name: 'b1', steps: [waitStep('other')] },
          { name: 'b2', steps: [nested] },
        ],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-branch')).toBe(nested);
  });

  it('finds step inside merge.steps', () => {
    const nested = waitStep('in-merge');
    const steps = [
      { name: 'mrg', type: 'merge', sources: ['b1'], steps: [nested] },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-merge')).toBe(nested);
  });

  it('finds deeply nested step: foreach > if > target', () => {
    const target = waitStep('deep-target');
    const steps = [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '{{ items }}',
        steps: [
          {
            name: 'check',
            type: 'if',
            condition: 'true',
            steps: [target],
          },
        ],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'deep-target')).toBe(target);
  });

  it('returns first found for duplicate step names (depth-first)', () => {
    const first = waitStep('dup');
    const second = waitStep('dup');
    const steps = [
      {
        name: 'loop',
        type: 'foreach',
        foreach: '{{ items }}',
        steps: [first],
      },
      second,
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'dup')).toBe(first);
  });

  it('handles empty string step name', () => {
    const target = waitStep('');
    const steps = [target];
    expect(getStepByNameFromNestedSteps(steps, '')).toBe(target);
  });
});
