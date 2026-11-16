/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCompletingOutputBlocks } from './run_outcomes';

const callStep = (name: string) => ({
  name,
  type: 'workflow.execute',
  with: { 'workflow-id': 'child' },
});

describe('getCompletingOutputBlocks', () => {
  const output = (name: string, values: Record<string, unknown>) => ({
    name,
    type: 'workflow.output',
    with: values,
  });

  it('skips workflow.output steps no run reaches', () => {
    expect(
      getCompletingOutputBlocks({
        steps: [output('first', { score: 1 }), output('second', { score: 1, value: 2 })],
      })
    ).toEqual([{ score: 1 }]);
  });

  it('keeps fallbacks that a failing step might run', () => {
    expect(
      getCompletingOutputBlocks({
        settings: { 'on-failure': { fallback: [output('recover', { recovered: true })] } },
        steps: [output('emit', { score: '${{ inputs.score }}' })],
      })
    ).toEqual([{ score: '${{ inputs.score }}' }, { recovered: true }]);
  });

  it('skips fallbacks behind an output step whose values have nothing to render', () => {
    expect(
      getCompletingOutputBlocks({
        settings: { 'on-failure': { fallback: [output('recover', { recovered: true })] } },
        steps: [output('emit', { score: 1, nested: [{ label: 'plain' }] })],
      })
    ).toEqual([{ score: 1, nested: [{ label: 'plain' }] }]);
  });

  it.each([[[]], ['[]']])('skips the steps of a loop over %j', (items) => {
    expect(
      getCompletingOutputBlocks({
        steps: [
          { name: 'loop', type: 'foreach', foreach: items, steps: [output('early', { a: 1 })] },
          output('emit', { b: 1 }),
        ],
      })
    ).toEqual([{ b: 1 }]);
  });

  it('keeps every block when a run might reach steps it does not follow', () => {
    expect(
      getCompletingOutputBlocks({
        steps: [
          {
            name: 'fan',
            type: 'parallel',
            branches: [{ name: 'one', steps: [output('early', { a: 1 })] }],
          },
          output('emit', { b: 1 }),
        ],
      })
    ).toEqual([{ a: 1 }, { b: 1 }]);
  });

  it('keeps every block of a workflow that does not compile', () => {
    expect(
      getCompletingOutputBlocks({
        steps: [
          {
            name: 'fan',
            type: 'parallel',
            branches: [{ name: 'one', steps: [{ ...callStep('nested'), if: 'inputs.a : true' }] }],
          },
          output('first', { a: 1 }),
          output('second', { b: 1 }),
        ],
      })
    ).toEqual([{ a: 1 }, { b: 1 }]);
  });
});
