/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InsertionPoints } from './compute_insertion_points';
import { resolveAppendInsertTarget } from './resolve_append_insert_target';

describe('resolveAppendInsertTarget', () => {
  const insertionPoints: InsertionPoints = {
    topLevelStepNodeIds: ['a', 'b'],
    byNodeId: new Map([
      ['trig', { step: { sourceNodeId: 'trig' } }],
      [
        'a',
        {
          step: {
            sourceNodeId: 'a',
            stepName: 'step_a',
            isTerminal: false,
          },
        },
      ],
      [
        'b',
        {
          step: {
            sourceNodeId: 'b',
            stepName: 'step_b',
            isTerminal: true,
          },
        },
      ],
    ]),
  };

  it('appends to the trunk terminal when nothing is selected', () => {
    expect(resolveAppendInsertTarget(insertionPoints, undefined)).toEqual({
      mode: 'after',
      stepName: 'step_b',
    });
  });

  it('appends to the trunk terminal when a mid-sequence top-level step is selected', () => {
    expect(resolveAppendInsertTarget(insertionPoints, 'a')).toEqual({
      mode: 'after',
      stepName: 'step_b',
    });
  });

  it('inserts directly after selection when the selected step is nested', () => {
    const nested: InsertionPoints = {
      topLevelStepNodeIds: ['if1'],
      byNodeId: new Map([
        [
          'if1',
          {
            branches: new Map([
              [
                'steps',
                { slot: { kind: 'steps' as const }, ownerStepName: 'if1', isTerminal: false },
              ],
            ]),
          },
        ],
        [
          'then-a',
          {
            step: {
              sourceNodeId: 'then-a',
              stepName: 'then_a',
              isTerminal: true,
            },
          },
        ],
      ]),
    };
    expect(resolveAppendInsertTarget(nested, 'then-a')).toEqual({
      mode: 'after',
      stepName: 'then_a',
    });
  });

  it('returns undefined when there are no named steps (trigger-only)', () => {
    const triggerOnly: InsertionPoints = {
      topLevelStepNodeIds: [],
      byNodeId: new Map([['trig', { step: { sourceNodeId: 'trig' } }]]),
    };
    expect(resolveAppendInsertTarget(triggerOnly, undefined)).toBeUndefined();
  });
});
