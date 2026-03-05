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

  it('accepts a date math expression starting with "now"', () => {
    expect(schema.safeParse('now-1d').success).toBe(true);
    expect(schema.safeParse('now-15m').success).toBe(true);
    expect(schema.safeParse('now').success).toBe(true);
  });

  it('rejects an invalid date string', () => {
    expect(schema.safeParse('invalid').success).toBe(false);
  });

  it('rejects an invalid date math expression', () => {
    expect(schema.safeParse('now-abc').success).toBe(false);
  });
});
