/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getZodParamSchema } from './get_zod_param_schema';

describe('getZodParamSchema', () => {
  it('finds param in ZodObject shape', () => {
    const schema = z.object({ name: z.string() });
    expect(getZodParamSchema(schema, 'name')).toBeInstanceOf(z.ZodString);
  });

  it('returns undefined for missing param in ZodObject', () => {
    const schema = z.object({ name: z.string() });
    expect(getZodParamSchema(schema, 'missing')).toBeUndefined();
  });

  it('finds param in left side of ZodIntersection', () => {
    const left = z.object({ a: z.string() });
    const right = z.object({ b: z.number() });
    const schema = z.intersection(left, right);
    expect(getZodParamSchema(schema, 'a')).toBeInstanceOf(z.ZodString);
  });

  it('finds param in right side of ZodIntersection', () => {
    const left = z.object({ a: z.string() });
    const right = z.object({ b: z.number() });
    const schema = z.intersection(left, right);
    expect(getZodParamSchema(schema, 'b')).toBeInstanceOf(z.ZodNumber);
  });

  it('returns undefined when param is in neither side of intersection', () => {
    const left = z.object({ a: z.string() });
    const right = z.object({ b: z.number() });
    const schema = z.intersection(left, right);
    expect(getZodParamSchema(schema, 'missing')).toBeUndefined();
  });

  it('finds param in first union option', () => {
    const schema = z.union([z.object({ x: z.string() }), z.object({ y: z.number() })]);
    expect(getZodParamSchema(schema, 'x')).toBeInstanceOf(z.ZodString);
  });

  it('finds param in second union option', () => {
    const schema = z.union([z.object({ x: z.string() }), z.object({ y: z.number() })]);
    expect(getZodParamSchema(schema, 'y')).toBeInstanceOf(z.ZodNumber);
  });

  it('returns undefined when param is in no union option', () => {
    const schema = z.union([z.object({ x: z.string() }), z.object({ y: z.number() })]);
    expect(getZodParamSchema(schema, 'missing')).toBeUndefined();
  });

  it('returns undefined for non-compound type', () => {
    expect(getZodParamSchema(z.string(), 'anything')).toBeUndefined();
  });
});
