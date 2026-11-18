/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isInParallelBody } from './is_in_parallel_body';

const step = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'console',
  ...extra,
});

describe('isInParallelBody', () => {
  const steps = [
    step('top'),
    step('fan', {
      type: 'parallel',
      branches: [
        { name: 'a', steps: [step('in_branch_a')] },
        { name: 'b', steps: [step('in_branch_b')] },
      ],
    }),
    step('each', { type: 'parallel', foreach: '{{ x }}', steps: [step('in_dynamic_body')] }),
    step('loop', {
      type: 'foreach',
      steps: [
        step('in_loop'),
        step('nested_fan', {
          type: 'parallel',
          branches: [{ name: 'c', steps: [step('in_nested_branch')] }],
        }),
      ],
    }),
    step('branching', { type: 'if', steps: [step('in_if')], else: [step('in_else')] }),
    step('chooser', { type: 'switch', cases: [{ match: 'x', steps: [step('in_case')] }] }),
  ];

  it.each(['in_branch_a', 'in_branch_b', 'in_dynamic_body', 'in_nested_branch'])(
    'is true for %s, a direct child of a parallel body',
    (name) => {
      expect(isInParallelBody(steps, name)).toBe(true);
    }
  );

  it.each(['top', 'fan', 'each', 'loop', 'in_loop', 'in_if', 'in_else', 'in_case', 'missing'])(
    'is false for %s',
    (name) => {
      expect(isInParallelBody(steps, name)).toBe(false);
    }
  );

  it('is false without a definition', () => {
    expect(isInParallelBody(undefined, 'top')).toBe(false);
    expect(isInParallelBody([null, 'x', 1], 'top')).toBe(false);
  });
});
