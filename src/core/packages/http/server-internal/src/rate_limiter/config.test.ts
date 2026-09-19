/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rateLimiterConfigSchema } from './config';

describe('rateLimiterConfigSchema', () => {
  it('defaults elu history algorithm to ema', () => {
    expect(rateLimiterConfigSchema.validate({})).toEqual({
      enabled: false,
      algorithm: 'ema',
    });
  });

  it('accepts time-weighted-ema', () => {
    expect(
      rateLimiterConfigSchema.validate({
        enabled: true,
        algorithm: 'time-weighted-ema',
        elu: 0.8,
      })
    ).toMatchObject({
      enabled: true,
      algorithm: 'time-weighted-ema',
      elu: 0.8,
      term: 'long',
    });
  });
});
