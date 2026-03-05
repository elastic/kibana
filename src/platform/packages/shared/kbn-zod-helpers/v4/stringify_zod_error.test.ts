/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { stringifyZodError } from './stringify_zod_error';

describe('stringifyZodError', () => {
  it('stringifies a simple validation error', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(stringifyZodError(result.error)).toContain('name');
    }
  });

  it('includes the path for nested errors', () => {
    const schema = z.object({ user: z.object({ age: z.number() }) });
    const result = schema.safeParse({ user: { age: 'not a number' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(stringifyZodError(result.error)).toContain('user.age');
    }
  });

  it('stringifies root-level errors without a path prefix', () => {
    const schema = z.string();
    const result = schema.safeParse(42);

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = stringifyZodError(result.error);
      expect(message).not.toContain('.');
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('flattens invalid_union errors', () => {
    const schema = z.union([
      z.object({ type: z.literal('a'), value: z.string() }),
      z.object({ type: z.literal('b'), count: z.number() }),
    ]);
    const result = schema.safeParse({ type: 'c' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = stringifyZodError(result.error);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('truncates when there are more than 5 errors', () => {
    const schema = z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      d: z.string(),
      e: z.string(),
      f: z.string(),
    });
    const result = schema.safeParse({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 });

    expect(result.success).toBe(false);
    if (!result.success) {
      const message = stringifyZodError(result.error);
      expect(message).toContain('and 1 more');
    }
  });

  it('returns empty string for an error with no issues', () => {
    const error = new z.ZodError([]);
    expect(stringifyZodError(error)).toBe('');
  });
});
