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
  it('defaults to enabled with medium term and elu 0.8', () => {
    expect(rateLimiterConfigSchema.validate({})).toEqual({
      enabled: true,
      elu: 0.8,
      term: 'medium',
    });
  });

  it('allows disabling without elu or term', () => {
    expect(rateLimiterConfigSchema.validate({ enabled: false })).toEqual({
      enabled: false,
    });
  });
});
