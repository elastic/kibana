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

const SAMPLES_BY_MODE = [
  {
    mode: 'default (UTC only)',
    options: undefined,
    valid: [
      '2024-01-01T10:00Z',
      '2024-01-01T10:00:00Z',
      '2024-01-01T10:00:00.123Z',
      '2024-02-29T10:00Z',
    ],
    invalid: [
      '2024-02-30T10:00Z',
      '2023-02-29T10:00Z',
      '2024-01-01T24:00Z',
      '2024-01-01T10:00+01:00',
      '2024-01-01T10:00',
      'not-a-datetime',
    ],
  },
  {
    mode: 'offset: true',
    options: { offset: true },
    valid: [
      '2024-01-01T10:00Z',
      '2024-01-01T10:00+01:00',
      '2024-01-01T10:00:00+01:00',
      '2024-01-01T10:00:00.123-05:30',
    ],
    invalid: [
      '2024-02-30T10:00Z',
      '2024-01-01T10:00+24:00',
      '2024-01-01T10:00+0100',
      '2024-01-01T10:00',
      'not-a-datetime',
    ],
  },
];

describe('isoDateTime', () => {
  describe.each(SAMPLES_BY_MODE)('$mode', ({ options, valid, invalid }) => {
    const schema = isoDateTime(options);
    const pattern = new RegExp((z.toJSONSchema(schema) as { pattern: string }).pattern);

    it.each(valid)('accepts %s in zod and the JSON Schema pattern', (value) => {
      expect(schema.safeParse(value).success).toBe(true);
      expect(pattern.test(value)).toBe(true);
    });

    it.each(invalid)('rejects %s in zod and the JSON Schema pattern', (value) => {
      expect(schema.safeParse(value).success).toBe(false);
      expect(pattern.test(value)).toBe(false);
    });
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

  it('emits JSON Schema type, format, maxLength, and pattern', () => {
    expect(z.toJSONSchema(isoDateTime())).toMatchObject({
      type: 'string',
      format: 'date-time',
      maxLength: 64,
      pattern: expect.any(String),
    });
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
