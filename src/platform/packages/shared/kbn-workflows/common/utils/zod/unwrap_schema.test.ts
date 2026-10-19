/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { unwrapSchema } from './unwrap_schema';

describe('unwrapSchema', () => {
  it('returns an unwrapped schema untouched', () => {
    const schema = z.string();
    expect(unwrapSchema(schema)).toBe(schema);
  });

  it('unwraps ZodOptional', () => {
    const inner = z.string();
    expect(unwrapSchema(inner.optional())).toBe(inner);
  });

  it('unwraps ZodNullable', () => {
    const inner = z.string();
    expect(unwrapSchema(inner.nullable())).toBe(inner);
  });

  it('unwraps ZodDefault', () => {
    const inner = z.string();
    expect(unwrapSchema(inner.default('a'))).toBe(inner);
  });

  it('unwraps ZodLazy', () => {
    const inner = z.object({ x: z.boolean() });
    expect(unwrapSchema(z.lazy(() => inner))).toBe(inner);
  });

  it('unwraps nested wrappers of mixed kinds', () => {
    const inner = z.object({ a: z.string() });
    const schema = z.lazy(() => inner.nullable().optional()).optional();
    expect(unwrapSchema(schema)).toBe(inner);
  });

  it('leaves unions and arrays wrapped', () => {
    const union = z.union([z.string(), z.number()]);
    expect(unwrapSchema(union.optional())).toBe(union);

    const array = z.array(z.string().optional());
    expect(unwrapSchema(array)).toBe(array);
  });
});
