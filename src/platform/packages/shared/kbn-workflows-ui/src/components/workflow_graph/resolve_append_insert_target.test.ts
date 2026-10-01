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
      ['trig', { step: { index: 0, sourceNodeId: 'trig' } }],
      [
        'a',
        {
          step: {
            index: 1,
            sourceNodeId: 'a',
            isTerminal: false,
          },
        },
      ],
      [
        'b',
        {
          step: {
            index: 2,
            sourceNodeId: 'b',
            isTerminal: true,
          },
        },
      ],
    ]),
  };

  it('appends to the trunk terminal when nothing is selected', () => {
    expect(resolveAppendInsertTarget(insertionPoints, undefined)).toEqual({
      index: 2,
      sourceNodeId: 'b',
      isTerminal: true,
    });
  });

  it('appends to the same sequence terminal when a mid-sequence step is selected', () => {
    expect(resolveAppendInsertTarget(insertionPoints, 'a')).toEqual({
      index: 2,
      sourceNodeId: 'b',
      isTerminal: true,
    });
  });

  it('uses a nested path terminal when the selection is in that path', () => {
    const nested: InsertionPoints = {
      topLevelStepNodeIds: ['if1'],
      byNodeId: new Map([
        [
          'then-a',
          {
            step: {
              index: 1,
              path: [{ stepIndex: 0, branch: 'steps' }],
              sourceNodeId: 'then-a',
              isTerminal: true,
            },
          },
        ],
      ]),
    };
    expect(resolveAppendInsertTarget(nested, 'then-a')?.path).toEqual([
      { stepIndex: 0, branch: 'steps' },
    ]);
  });
});
