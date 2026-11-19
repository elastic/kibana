/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  canSetBreakpointOnStep,
  isBreakpointSupportedStepType,
} from './use_breakpoint_decorations';

describe('canSetBreakpointOnStep', () => {
  const steps = {
    branches: { stepType: 'parallel' },
    in_parallel: { stepType: 'http', parentStepId: 'branches' },
    check: { stepType: 'if', parentStepId: 'branches' },
    nested_in_parallel: { stepType: 'console', parentStepId: 'check' },
    condition: { stepType: 'if' },
    in_if: { stepType: 'http', parentStepId: 'condition' },
  };

  it('allows atomic steps outside parallel, including inside other containers', () => {
    expect(canSetBreakpointOnStep(steps.in_if, steps)).toBe(true);
  });

  it('disallows steps nested at any depth inside a parallel branch', () => {
    expect(canSetBreakpointOnStep(steps.in_parallel, steps)).toBe(false);
    expect(canSetBreakpointOnStep(steps.nested_in_parallel, steps)).toBe(false);
  });
});

describe('isBreakpointSupportedStepType', () => {
  it.each(['http', 'console', 'data.set', 'elasticsearch.search', 'kibana.createCase', 'ai.agent'])(
    'allows breakpoints on atomic/action step type "%s" (whether top-level or nested inside if/foreach)',
    (stepType) => {
      expect(isBreakpointSupportedStepType(stepType)).toBe(true);
    }
  );

  it.each([
    'if',
    'foreach',
    'while',
    'switch',
    'parallel',
    'merge',
    'wait',
    'waitForInput',
    'waitForApproval',
    'workflow.execute',
    'workflow.executeAsync',
    'workflow.output',
    'workflow.fail',
    'loop.break',
    'loop.continue',
    undefined,
  ])('disallows breakpoints on non-atomic structural/wait step type "%s"', (stepType) => {
    expect(isBreakpointSupportedStepType(stepType)).toBe(false);
  });
});
