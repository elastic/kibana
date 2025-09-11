/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('column caching and casing', () => {
  it('expression columns are cached case-sensitively', async () => {
    const { expectErrors } = await setup();
    await expectErrors('FROM index | EVAL TrIm("") | EVAL `TrIm("")`', []);
    await expectErrors('FROM index | EVAL TrIm("") | EVAL `TRIM("")`', [
      'Unknown column "TRIM("")"',
    ]);
  });

  it('case changes bust the cache', async () => {
    const { expectErrors } = await setup();
    // first populate the cache with capitalized TRIM query
    await expectErrors('FROM index | EVAL ABS(1) | EVAL `ABS(1)`', []);

    // change the case of the TRIM to trim, which should bust the cache and create an error
    await expectErrors('FROM index | EVAL abs(1) | EVAL `ABS(1)`', ['Unknown column "ABS(1)"']);
  });
});
