/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getPitParams } from './pit_params';

describe('searchDsl/getPitParams', () => {
  it('returns only an ID by default', () => {
    expect(getPitParams({ id: 'abc123' })).toEqual({
      pit: {
        id: 'abc123',
      },
    });
  });

  it('includes keepAlive if provided and rewrites to snake case', () => {
    expect(getPitParams({ id: 'abc123', keepAlive: '1m' })).toEqual({
      pit: {
        id: 'abc123',
        keep_alive: '1m',
      },
    });
  });
});
