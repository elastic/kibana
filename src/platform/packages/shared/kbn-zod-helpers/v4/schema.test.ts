/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isSchema, createIsNarrowSchema } from './schema';

describe('isSchema', () => {
  it('returns true when the value matches the schema', () => {
    expect(isSchema(z.string(), 'hello')).toBe(true);
  });

  it('returns false when the value does not match the schema', () => {
    expect(isSchema(z.string(), 123)).toBe(false);
  });

  it('works with object schemas', () => {
    const schema = z.object({ id: z.number() });
    expect(isSchema(schema, { id: 1 })).toBe(true);
    expect(isSchema(schema, { id: 'not a number' })).toBe(false);
  });
});

describe('createIsNarrowSchema', () => {
  const baseSchema = z.union([
    z.object({ type: z.literal('a'), value: z.string() }),
    z.object({ type: z.literal('b'), count: z.number() }),
  ]);

  const narrowSchema = z.object({ type: z.literal('a'), value: z.string() });

  const isTypeA = createIsNarrowSchema(baseSchema, narrowSchema);

  it('returns true for values matching the narrow schema', () => {
    expect(isTypeA({ type: 'a', value: 'hello' })).toBe(true);
  });

  it('returns false for values not matching the narrow schema', () => {
    expect(isTypeA({ type: 'b', count: 42 })).toBe(false);
  });
});
