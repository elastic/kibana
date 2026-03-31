/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectAllSteps, getStepByNameFromNestedSteps } from './definition_utils';
import type { Step } from '../spec/schema';

// Step is a discriminated union (foreach | if | while | switch | ...).
// The function under test only reads `name`, `type`, and nested arrays,
// so we build minimal shapes and cast through `unknown` to satisfy the union.
const waitStep = (name: string): Step =>
  ({ name, type: 'wait', duration: '1s' } as unknown as Step);

describe('collectAllSteps', () => {
  it('returns flat steps unchanged', () => {
    const steps = [waitStep('a'), waitStep('b')];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    expect(collectAllSteps([])).toEqual([]);
  });

  it('collects steps inside foreach', () => {
    const steps = [
      { name: 'loop', type: 'foreach', foreach: '{{ items }}', steps: [waitStep('inner')] },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['loop', 'inner']);
  });

  it('collects steps inside while', () => {
    const steps = [
      { name: 'loop', type: 'while', condition: 'true', steps: [waitStep('inner')] },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['loop', 'inner']);
  });

  it('collects steps inside if/else', () => {
    const steps = [
      {
        name: 'branch',
        type: 'if',
        condition: 'true',
        steps: [waitStep('then_step')],
        else: [waitStep('else_step')],
      },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['branch', 'then_step', 'else_step']);
  });

  it('collects steps inside parallel branches', () => {
    const steps = [
      {
        name: 'par',
        type: 'parallel',
        branches: [
          { name: 'b1', steps: [waitStep('b1_step')] },
          { name: 'b2', steps: [waitStep('b2_step'), waitStep('b2_step2')] },
        ],
      },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual([
      'par',
      'b1_step',
      'b2_step',
      'b2_step2',
    ]);
  });

  it('collects steps inside merge', () => {
    const steps = [
      { name: 'mrg', type: 'merge', sources: ['b1'], steps: [waitStep('inner')] },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['mrg', 'inner']);
  });

  it('collects steps inside switch cases and default', () => {
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [
          { match: 'a', steps: [waitStep('case_a')] },
          { match: 'b', steps: [waitStep('case_b')] },
        ],
        default: [waitStep('default_step')],
      },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual([
      'sw',
      'case_a',
      'case_b',
      'default_step',
    ]);
  });

  it('handles deeply nested control flow', () => {
    const steps = [
      {
        name: 'outer_if',
        type: 'if',
        condition: 'true',
        steps: [
          {
            name: 'inner_foreach',
            type: 'foreach',
            foreach: '{{ items }}',
            steps: [
              {
                name: 'inner_switch',
                type: 'switch',
                expression: '{{ y }}',
                cases: [{ match: 'x', steps: [waitStep('deep')] }],
              },
            ],
          },
        ],
      },
    ] as unknown as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual([
      'outer_if',
      'inner_foreach',
      'inner_switch',
      'deep',
    ]);
  });
});

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

  it('prefers if.steps over if.else when names collide', () => {
    const inThen = waitStep('dup');
    const inElse = waitStep('dup');
    const steps = [
      {
        name: 'check',
        type: 'if',
        condition: 'true',
        steps: [inThen],
        else: [inElse],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'dup')).toBe(inThen);
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

  it('finds step inside while.steps', () => {
    const nested = waitStep('in-while');
    const steps = [
      { name: 'loop', type: 'while', condition: 'true', steps: [nested] },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-while')).toBe(nested);
  });

  it('finds step inside switch.cases', () => {
    const nested = waitStep('in-case');
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [{ match: 'a', steps: [nested] }],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-case')).toBe(nested);
  });

  it('finds step inside switch.default', () => {
    const nested = waitStep('in-default');
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [{ match: 'a', steps: [waitStep('other')] }],
        default: [nested],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'in-default')).toBe(nested);
  });

  it('prefers switch.cases over switch.default when names collide', () => {
    const inCase = waitStep('dup');
    const inDefault = waitStep('dup');
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [{ match: 'a', steps: [inCase] }],
        default: [inDefault],
      },
    ] as unknown as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'dup')).toBe(inCase);
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

  it('finds deeply nested step: parallel > switch > while > target', () => {
    const target = waitStep('deep-target');
    const steps = [
      {
        name: 'par',
        type: 'parallel',
        branches: [
          {
            name: 'b1',
            steps: [
              {
                name: 'sw',
                type: 'switch',
                expression: '{{ x }}',
                cases: [
                  {
                    match: 'a',
                    steps: [
                      {
                        name: 'loop',
                        type: 'while',
                        condition: 'true',
                        steps: [target],
                      },
                    ],
                  },
                ],
              },
            ],
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

  describe('handles malformed container steps without throwing', () => {
    it.each([
      ['foreach without steps', { name: 'loop', type: 'foreach', foreach: '{{ items }}' }],
      ['while without steps', { name: 'loop', type: 'while', condition: 'true' }],
      ['if without steps or else', { name: 'check', type: 'if', condition: 'true' }],
      ['parallel without branches', { name: 'par', type: 'parallel' }],
      ['merge without steps', { name: 'mrg', type: 'merge', sources: ['b1'] }],
    ])('%s', (_label, shape) => {
      const steps = [shape] as unknown as Step[];
      expect(getStepByNameFromNestedSteps(steps, 'unreachable')).toBeNull();
    });
  });
});
