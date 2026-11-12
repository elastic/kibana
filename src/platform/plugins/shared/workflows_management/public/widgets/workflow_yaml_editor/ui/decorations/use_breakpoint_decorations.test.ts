/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBreakpointSupportedStepType } from './use_breakpoint_decorations';

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
