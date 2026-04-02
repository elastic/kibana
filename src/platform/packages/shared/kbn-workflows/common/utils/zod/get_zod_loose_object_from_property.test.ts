/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodLooseObjectFromProperty } from './get_zod_loose_object_from_property';

describe('getZodLooseObjectFromProperty', () => {
  it('returns a looseObject with shape when property is present', () => {
    const schema = z.object({
      nested: z.object({ a: z.string() }),
    });
    const result = getZodLooseObjectFromProperty(schema, 'nested');

    expect(result).toBeInstanceOf(z.ZodObject);
    expect(result.shape).toHaveProperty('a');
  });

  it('returns empty looseObject when property is absent (NOT null)', () => {
    const schema = z.object({ name: z.string() });
    const result = getZodLooseObjectFromProperty(schema, 'missing');

    expect(result).toBeInstanceOf(z.ZodObject);
    expect(Object.keys(result.shape)).toHaveLength(0);
  });

  it('accepts additional properties (loose object behavior)', () => {
    const schema = z.object({ name: z.string() });
    const result = getZodLooseObjectFromProperty(schema, 'missing');

    // Loose object should accept any extra properties
    expect(() => result.parse({ extra: true })).not.toThrow();
  });
});
