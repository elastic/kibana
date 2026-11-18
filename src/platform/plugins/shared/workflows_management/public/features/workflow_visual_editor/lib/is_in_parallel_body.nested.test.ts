/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isInParallelBody } from './is_in_parallel_body';

const leaf = (name: string) => ({ name, type: 'console' });
const parallel = (name: string, children: unknown[]) => ({
  name,
  type: 'parallel',
  steps: children,
});

/**
 * The engine rejects a step-level `if`, `on-failure` or `timeout` on a step that is a direct child
 * of a parallel body, wherever that parallel step sits, so the walk must reach every container a
 * step can hold, not only `steps`, `else`, `cases` and `branches`.
 */
describe('isInParallelBody for a parallel step nested in any container', () => {
  it.each([
    ['a switch default', { name: 'sw', type: 'switch', default: [parallel('p', [leaf('inner')])] }],
    [
      'a switch case',
      {
        name: 'sw',
        type: 'switch',
        cases: [{ match: 'a', steps: [parallel('p', [leaf('inner')])] }],
      },
    ],
    ['an if else', { name: 'if1', type: 'if', else: [parallel('p', [leaf('inner')])] }],
    [
      'an on-failure fallback',
      { name: 'x', type: 'console', 'on-failure': { fallback: [parallel('p', [leaf('inner')])] } },
    ],
    [
      'a loop iteration fallback',
      {
        name: 'loop',
        type: 'foreach',
        'iteration-on-failure': { fallback: [parallel('p', [leaf('inner')])] },
      },
    ],
  ])('finds a direct child of it inside %s', (_label, owner) => {
    expect(isInParallelBody([owner], 'inner')).toBe(true);
  });

  it('does not take the fallback of a parallel step itself for its body', () => {
    const steps = [
      {
        name: 'p',
        type: 'parallel',
        steps: [leaf('in_body')],
        'on-failure': { fallback: [leaf('in_fallback')] },
      },
    ];
    expect(isInParallelBody(steps, 'in_body')).toBe(true);
    expect(isInParallelBody(steps, 'in_fallback')).toBe(false);
  });

  it('does not take a step in a container of a step that is not parallel', () => {
    const steps = [{ name: 'sw', type: 'switch', default: [leaf('plain')] }];
    expect(isInParallelBody(steps, 'plain')).toBe(false);
  });

  it('does not take a step in a nested container for a direct child of the parallel body', () => {
    const steps = [parallel('p', [{ name: 'sw', type: 'switch', default: [leaf('deeper')] }])];
    expect(isInParallelBody(steps, 'deeper')).toBe(false);
    expect(isInParallelBody(steps, 'sw')).toBe(true);
  });
});
