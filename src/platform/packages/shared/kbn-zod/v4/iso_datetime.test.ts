/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import { isoDateTime } from './iso_datetime';

describe('isoDateTime', () => {
  const utcMinute = '2024-01-01T10:00Z';
  const utcSecond = '2024-01-01T10:00:00Z';
  const utcFraction = '2024-01-01T10:00:00.123Z';
  const offsetMinute = '2024-01-01T10:00+01:00';
  const offsetSecond = '2024-01-01T10:00:00+01:00';
  const localMinute = '2024-01-01T10:00';
  const localSecond = '2024-01-01T10:00:00';

  it('accepts minute and second precision for default UTC Z semantics', () => {
    const schema = isoDateTime();
    expect(schema.parse(utcMinute)).toBe(utcMinute);
    expect(schema.parse(utcSecond)).toBe(utcSecond);
    expect(schema.parse(utcFraction)).toBe(utcFraction);
    expect(schema.safeParse(offsetMinute).success).toBe(false);
    expect(schema.safeParse(localMinute).success).toBe(false);
  });

  it('accepts minute and second precision when offset is enabled', () => {
    const schema = isoDateTime({ offset: true });
    expect(schema.parse(utcMinute)).toBe(utcMinute);
    expect(schema.parse(offsetMinute)).toBe(offsetMinute);
    expect(schema.parse(offsetSecond)).toBe(offsetSecond);
    expect(schema.safeParse(localMinute).success).toBe(false);
  });

  it('accepts local datetimes with and without seconds when local is enabled', () => {
    const schema = isoDateTime({ local: true });
    expect(schema.parse(localMinute)).toBe(localMinute);
    expect(schema.parse(localSecond)).toBe(localSecond);
    expect(schema.parse(utcSecond)).toBe(utcSecond);
    expect(schema.safeParse(offsetMinute).success).toBe(false);
  });

  it('emits a single date-time string in JSON Schema', () => {
    const schema = isoDateTime({ offset: true });
    expect(z.toJSONSchema(schema)).toEqual(
      expect.objectContaining({
        type: 'string',
        format: 'date-time',
      })
    );
    expect(z.toJSONSchema(schema)).not.toHaveProperty('anyOf');
  });

  it('surfaces a reasonable error message for invalid input', () => {
    const schema = isoDateTime();
    const result = schema.safeParse('not-a-datetime');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/Invalid ISO datetime/i);
    }
  });

  it('forwards custom error messages from options', () => {
    const schema = isoDateTime({ message: 'Custom datetime message' });
    const result = schema.safeParse('bad');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Custom datetime message');
    }
  });
});
