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
  it('alternates deterministically and stays balanced', () => {
    expect(createPairedOrder({ pairs: 12 })).toEqual(
      Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 'baseline-target' : 'target-baseline'))
    );
    expect(createPairedOrder({ pairs: 12 })).toEqual(createPairedOrder({ pairs: 12 }));
  });

  it('keeps order counts balanced for an odd number of attempts', () => {
    const order = createPairedOrder({ pairs: 9 });
    expect(
      Math.abs(
        order.filter((entry) => entry === 'baseline-target').length -
          order.filter((entry) => entry === 'target-baseline').length
      )
    ).toBeLessThanOrEqual(1);
  });
});
