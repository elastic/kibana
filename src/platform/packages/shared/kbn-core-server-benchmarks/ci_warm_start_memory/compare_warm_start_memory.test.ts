/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPairedOrder } from '@kbn/bench';

describe('warm-start paired execution schedule', () => {
  it('is deterministic and balanced for a fixed seed', () => {
    const first = createPairedOrder({ pairs: 12, seed: 'baseline|target' });
    const second = createPairedOrder({ pairs: 12, seed: 'baseline|target' });

    expect(first).toEqual(second);
    expect(first.filter((entry) => entry === 'baseline-target')).toHaveLength(6);
    expect(first.filter((entry) => entry === 'target-baseline')).toHaveLength(6);
  });

  it('keeps order counts balanced for an odd number of attempts', () => {
    const order = createPairedOrder({ pairs: 9, seed: 'test' });
    expect(
      Math.abs(
        order.filter((entry) => entry === 'baseline-target').length -
          order.filter((entry) => entry === 'target-baseline').length
      )
    ).toBeLessThanOrEqual(1);
  });
});
