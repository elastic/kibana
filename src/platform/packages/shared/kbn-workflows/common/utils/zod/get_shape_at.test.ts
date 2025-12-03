/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getShapeAt } from './get_shape_at';
import { expectZodSchemaEqual } from './get_zod_schema_equal';

describe('getShapeAt', () => {
  it('should return the shape at the given property', () => {
    const schema = z.object({
      path: z.never(),
      query: z.optional(
        z.object({
          size: z.number(),
        })
      ),
      body: z.object({
        data: z.string(),
      }),
    });
    const atBody = getShapeAt(schema, 'body');
    expect(atBody).toHaveProperty('data');
    expectZodSchemaEqual(atBody.data, z.string());
    const atQuery = getShapeAt(schema, 'query');
    expect(atQuery).toHaveProperty('size');
    expectZodSchemaEqual(atQuery.size, z.number());
    const atPath = getShapeAt(schema, 'path');
    expect(atPath).toEqual({});
  });
});
