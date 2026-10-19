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

const DATETIME_SAMPLES = [
  '2024-01-01T10:00Z',
  '2024-01-01T10:00:00Z',
  '2024-01-01T10:00:00.123Z',
  '2024-02-29T10:00Z',
  '2024-02-30T10:00Z',
  '2024-01-01T10:00+02:00',
  '2024-01-01T10:00+01:00',
  '2024-01-01T10:00:00+01:00',
  '2024-01-01T10:00',
  'not-a-datetime',
];

const expectPatternMatchesSchema = (schema: z.ZodString) => {
  const jsonSchema = z.toJSONSchema(schema);
  expect(jsonSchema).toEqual(
    expect.objectContaining({
      type: 'string',
      format: 'date-time',
      maxLength: 64,
    })
  );
  expect(jsonSchema).not.toHaveProperty('anyOf');
  expect(jsonSchema).toHaveProperty('pattern');

  const pattern = (jsonSchema as { pattern: string }).pattern;
  const compiled = new RegExp(pattern);
  for (const sample of DATETIME_SAMPLES) {
    expect(compiled.test(sample)).toBe(schema.safeParse(sample).success);
  }
};

describe('isoDateTime', () => {
  const utcMinute = '2024-01-01T10:00Z';
  const utcSecond = '2024-01-01T10:00:00Z';
  const utcFraction = '2024-01-01T10:00:00.123Z';
  const offsetMinute = '2024-01-01T10:00+01:00';
  const offsetSecond = '2024-01-01T10:00:00+01:00';
  const localMinute = '2024-01-01T10:00';

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

  it('rejects an invalid calendar date and accepts a leap day', () => {
    const schema = isoDateTime();
    expect(schema.safeParse('2024-02-30T10:00Z').success).toBe(false);
    expect(schema.parse('2024-02-29T10:00Z')).toBe('2024-02-29T10:00Z');
  });

  it('rejects values longer than 64 characters', () => {
    const schema = isoDateTime();
    const value = `2024-01-01T10:00:00.${'1'.repeat(44)}Z`;
    expect(value.length).toBeGreaterThan(64);
    const result = schema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ code }) => code)).toEqual(['too_big']);
  });

  it('uses the custom message for values longer than 64 characters', () => {
    const schema = isoDateTime({ message: 'Custom datetime message' });
    const result = schema.safeParse('x'.repeat(65));
    expect(result.error?.issues.map(({ message }) => message)).toEqual(['Custom datetime message']);
  });

  it('emits JSON Schema format, maxLength, and a pattern that matches validation', () => {
    expectPatternMatchesSchema(isoDateTime());
    expectPatternMatchesSchema(isoDateTime({ offset: true }));
  });

  it('surfaces a reasonable error message for invalid input', () => {
    const schema = isoDateTime();
    const result = schema.safeParse('not-a-datetime');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.message).toMatch(/Invalid ISO datetime/i);
    }
  });

  it('forwards custom error messages from options', () => {
    const schema = isoDateTime({ message: 'Custom datetime message' });
    const result = schema.safeParse('bad');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.message).toBe('Custom datetime message');
    }
  });

  it('accepts a string as the error message', () => {
    const schema = isoDateTime('Custom datetime message');
    const result = schema.safeParse('bad');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.message).toBe('Custom datetime message');
    }
  });
});
