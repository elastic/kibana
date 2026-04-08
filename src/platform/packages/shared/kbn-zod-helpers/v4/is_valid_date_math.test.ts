/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isValidDateMath } from './is_valid_date_math';

describe('isValidDateMath', () => {
  const schema = z.string().superRefine(isValidDateMath);

  it('accepts a valid ISO date string', () => {
    expect(schema.safeParse('2022-05-20T08:10:15.000Z').success).toBe(true);
  });

  it('accepts a date-only string', () => {
    expect(schema.safeParse('2022-05-20').success).toBe(true);
  });

  it('accepts "now" by itself', () => {
    expect(schema.safeParse('now').success).toBe(true);
  });

  it('accepts subtraction expressions', () => {
    expect(schema.safeParse('now-1d').success).toBe(true);
    expect(schema.safeParse('now-15m').success).toBe(true);
    expect(schema.safeParse('now-1h').success).toBe(true);
    expect(schema.safeParse('now-1w').success).toBe(true);
    expect(schema.safeParse('now-1M').success).toBe(true);
    expect(schema.safeParse('now-1y').success).toBe(true);
  });

  it('accepts addition expressions', () => {
    expect(schema.safeParse('now+1d').success).toBe(true);
    expect(schema.safeParse('now+5h').success).toBe(true);
  });

  it('accepts rounding expressions', () => {
    expect(schema.safeParse('now/d').success).toBe(true);
    expect(schema.safeParse('now/M').success).toBe(true);
    expect(schema.safeParse('now-1d/d').success).toBe(true);
  });

  it('accepts leading whitespace before "now"', () => {
    expect(schema.safeParse('  now-1d').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(schema.safeParse('').success).toBe(false);
  });

  it('rejects an arbitrary string', () => {
    expect(schema.safeParse('invalid').success).toBe(false);
  });

  it('rejects an invalid date math expression', () => {
    expect(schema.safeParse('now-abc').success).toBe(false);
  });
});
