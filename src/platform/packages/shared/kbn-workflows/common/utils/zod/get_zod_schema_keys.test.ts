/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodSchemaKeys } from './get_zod_schema_keys';

describe('getZodSchemaKeys', () => {
  it('should return the keys of a simple object schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const keys = getZodSchemaKeys(schema);
    expect(keys).toEqual(['name', 'age']);
  });

  it('should return the keys of a nested schema with intersections and unions', () => {
    const schema = z.intersection(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
      z.union([
        z.object({
          city: z.string(),
          country: z.string(),
        }),
        z.object({
          state: z.string(),
          zip: z.string(),
        }),
      ])
    );
    const keys = getZodSchemaKeys(schema);
    expect(keys).toEqual(['name', 'age', 'city', 'country', 'state', 'zip']);
  });
});
