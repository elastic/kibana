/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isoToEpoch } from './iso_to_epoch';

describe('isoToEpoch', () => {
  const schema = z.string().transform(isoToEpoch);

  it('converts a valid ISO date string to epoch milliseconds', () => {
    const result = schema.parse('2022-05-20T08:10:15.000Z');
    expect(result).toBe(new Date('2022-05-20T08:10:15.000Z').getTime());
  });

  it('converts another valid ISO date string', () => {
    const result = schema.parse('2000-01-01T00:00:00.000Z');
    expect(result).toBe(946684800000);
  });

  it('fails on an invalid date string', () => {
    const result = schema.safeParse('not-a-date');
    expect(result.success).toBe(false);
  });

  it('fails on an empty string', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
  });
});
