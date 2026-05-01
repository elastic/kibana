/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodSchemaType } from './get_zod_schema_type';

describe('getZodSchemaType', () => {
  it('returns "string" for z.string()', () => {
    expect(getZodSchemaType(z.string())).toBe('string');
  });

  it('returns "number" for z.number()', () => {
    expect(getZodSchemaType(z.number())).toBe('number');
  });

  it('returns "object" for z.object()', () => {
    expect(getZodSchemaType(z.object({}))).toBe('object');
  });

  it('returns "unknown" for null input', () => {
    expect(getZodSchemaType(null as unknown as z.ZodType)).toBe('unknown');
  });

  it('returns "unknown" for undefined input', () => {
    expect(getZodSchemaType(undefined as unknown as z.ZodType)).toBe('unknown');
  });

  it('returns "unknown" for object without def property', () => {
    expect(getZodSchemaType({} as unknown as z.ZodType)).toBe('unknown');
  });
});
