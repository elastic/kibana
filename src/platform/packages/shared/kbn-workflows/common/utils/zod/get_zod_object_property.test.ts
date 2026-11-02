/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodObjectProperty } from './get_zod_object_property';

describe('getZodObjectProperty', () => {
  it('returns the property schema when present', () => {
    const schema = z.object({ name: z.string() });
    const result = getZodObjectProperty(schema, 'name');
    expect(result).toBeInstanceOf(z.ZodString);
  });

  it('returns null when property is absent', () => {
    const schema = z.object({ name: z.string() });
    expect(getZodObjectProperty(schema, 'missing')).toBeNull();
  });

  it('returns null for non-ZodObject schema', () => {
    expect(getZodObjectProperty(z.string(), 'anything')).toBeNull();
  });

  it('returns null for empty string property name', () => {
    const schema = z.object({ name: z.string() });
    expect(getZodObjectProperty(schema, '')).toBeNull();
  });

  it('returns optional schema without unwrapping', () => {
    const schema = z.object({ opt: z.string().optional() });
    const result = getZodObjectProperty(schema, 'opt');
    expect(result).toBeInstanceOf(z.ZodOptional);
  });
});
