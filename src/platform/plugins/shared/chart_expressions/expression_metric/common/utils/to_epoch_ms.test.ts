/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toEpochMs } from './to_epoch_ms';

describe('toEpochMs', () => {
  it('returns the number as-is when given epoch milliseconds', () => {
    expect(toEpochMs(1704067200000)).toBe(1704067200000);
  });

  it('returns 0 for epoch zero', () => {
    expect(toEpochMs(0)).toBe(0);
  });

  it('converts an ISO date string to epoch milliseconds', () => {
    expect(toEpochMs('2024-01-01T00:00:00.000Z')).toBe(1704067200000);
  });

  it('converts a date-only string to epoch milliseconds', () => {
    expect(toEpochMs('2024-01-01')).toBe(new Date('2024-01-01').getTime());
  });

  it('returns NaN for invalid dates', () => {
    expect(toEpochMs('not-a-date')).toBeNaN();
    expect(toEpochMs(null)).toBeNaN();
    expect(toEpochMs(undefined)).toBeNaN();
    expect(toEpochMs(true)).toBeNaN();
    expect(toEpochMs({})).toBeNaN();
  });
});
