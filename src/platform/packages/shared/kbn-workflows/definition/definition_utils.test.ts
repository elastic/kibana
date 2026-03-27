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

const step = (name: string, type: string = 'http'): Step => ({ name, type } as Step);

describe('collectAllSteps', () => {
  it('returns flat steps unchanged', () => {
    const steps = [step('a'), step('b')] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('collects steps inside foreach', () => {
    const steps = [
      { name: 'loop', type: 'foreach', foreach: '[]', steps: [step('inner')] },
    ] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['loop', 'inner']);
  });

  it('collects steps inside while', () => {
    const steps = [
      { name: 'loop', type: 'while', condition: 'true', steps: [step('inner')] },
    ] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['loop', 'inner']);
  });

  it('collects steps inside if/else', () => {
    const steps = [
      {
        name: 'branch',
        type: 'if',
        condition: 'true',
        steps: [step('then_step')],
        else: [step('else_step')],
      },
    ] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['branch', 'then_step', 'else_step']);
  });

  it('collects steps inside parallel branches', () => {
    const steps = [
      {
        name: 'par',
        type: 'parallel',
        branches: [{ steps: [step('b1')] }, { steps: [step('b2'), step('b3')] }],
      },
    ] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['par', 'b1', 'b2', 'b3']);
  });

  it('collects steps inside merge', () => {
    const steps = [{ name: 'mrg', type: 'merge', steps: [step('inner')] }] as Step[];
    expect(collectAllSteps(steps).map((s) => s.name)).toEqual(['mrg', 'inner']);
  });

  it('collects steps inside switch cases and default', () => {
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [
          { match: 'a', steps: [step('case_a')] },
          { match: 'b', steps: [step('case_b')] },
        ],
        default: [step('default_step')],
      },
    ] as Step[];
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
            foreach: '[]',
            steps: [
              {
                name: 'inner_switch',
                type: 'switch',
                expression: '{{ y }}',
                cases: [{ match: 'x', steps: [step('deep')] }],
              },
            ],
          },
        ],
      },
    ] as Step[];
    const names = collectAllSteps(steps).map((s) => s.name);
    expect(names).toEqual(['outer_if', 'inner_foreach', 'inner_switch', 'deep']);
  });

  it('returns empty array for empty input', () => {
    expect(collectAllSteps([])).toEqual([]);
  });
});

describe('getStepByNameFromNestedSteps', () => {
  it('finds a top-level step', () => {
    const steps = [step('a'), step('b')] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'b')?.name).toBe('b');
  });

  it('returns null for missing step', () => {
    const steps = [step('a')] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'missing')).toBeNull();
  });

  it('finds step inside foreach', () => {
    const steps = [
      { name: 'loop', type: 'foreach', foreach: '[]', steps: [step('inner')] },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'inner')?.name).toBe('inner');
  });

  it('finds step inside while', () => {
    const steps = [
      { name: 'loop', type: 'while', condition: 'true', steps: [step('inner')] },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'inner')?.name).toBe('inner');
  });

  it('finds step in if-else branches', () => {
    const steps = [
      {
        name: 'branch',
        type: 'if',
        condition: 'true',
        steps: [step('then_step')],
        else: [step('else_step')],
      },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'then_step')?.name).toBe('then_step');
    expect(getStepByNameFromNestedSteps(steps, 'else_step')?.name).toBe('else_step');
  });

  it('finds step in parallel branches', () => {
    const steps = [
      {
        name: 'par',
        type: 'parallel',
        branches: [{ steps: [step('b1')] }, { steps: [step('b2')] }],
      },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'b2')?.name).toBe('b2');
  });

  it('finds step inside merge', () => {
    const steps = [{ name: 'mrg', type: 'merge', steps: [step('inner')] }] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'inner')?.name).toBe('inner');
  });

  it('finds step in switch case', () => {
    const steps = [
      {
        name: 'sw',
        type: 'switch',
        expression: '{{ x }}',
        cases: [
          { match: 'a', steps: [step('case_a')] },
          { match: 'b', steps: [step('case_b')] },
        ],
        default: [step('default_step')],
      },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'case_b')?.name).toBe('case_b');
    expect(getStepByNameFromNestedSteps(steps, 'default_step')?.name).toBe('default_step');
  });

  it('finds deeply nested step', () => {
    const steps = [
      {
        name: 'outer',
        type: 'foreach',
        foreach: '[]',
        steps: [
          {
            name: 'mid',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'inner_switch',
                type: 'switch',
                expression: '{{ y }}',
                cases: [{ match: 'x', steps: [step('deep')] }],
              },
            ],
          },
        ],
      },
    ] as Step[];
    expect(getStepByNameFromNestedSteps(steps, 'deep')?.name).toBe('deep');
  });

  it('returns null for empty input', () => {
    expect(getStepByNameFromNestedSteps([], 'anything')).toBeNull();
  });
});
