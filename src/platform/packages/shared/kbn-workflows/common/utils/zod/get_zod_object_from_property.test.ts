/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodObjectFromProperty } from './get_zod_object_from_property';

describe('getZodObjectFromProperty', () => {
  it('returns a new ZodObject when property points to a nested object', () => {
    const schema = z.object({
      nested: z.object({ a: z.string(), b: z.number() }),
    });
    const result = getZodObjectFromProperty(schema, 'nested');

    expect(result).toBeInstanceOf(z.ZodObject);
    expect(result!.shape).toHaveProperty('a');
    expect(result!.shape).toHaveProperty('b');
  });

  it('returns null when property is absent', () => {
    const schema = z.object({ name: z.string() });
    expect(getZodObjectFromProperty(schema, 'missing')).toBeNull();
  });

  it('extracts shape from optional(object) via getShape unwrap', () => {
    const schema = z.object({
      nested: z.object({ x: z.string() }).optional(),
    });
    const result = getZodObjectFromProperty(schema, 'nested');

    expect(result).toBeInstanceOf(z.ZodObject);
    expect(result!.shape).toHaveProperty('x');
  });
});
