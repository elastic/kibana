/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getShape } from './get_shape';
import { expectZodSchemaEqual } from './get_zod_schema_equal';

describe('getShape', () => {
  it('returns shape from a plain object', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['a', 'b']);
    expectZodSchemaEqual(shape.a, z.string());
    expectZodSchemaEqual(shape.b, z.number());
  });

  it('unwraps ZodLazy', () => {
    const schema = z.lazy(() => z.object({ x: z.boolean() }));
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['x']);
    expectZodSchemaEqual(shape.x, z.boolean());
  });

  it('unwraps ZodOptional', () => {
    const schema = z.optional(z.object({ y: z.string() }));
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['y']);
    expectZodSchemaEqual(shape.y, z.string());
  });

  it('unwraps z.optional(z.lazy(...))', () => {
    const schema = z.optional(z.lazy(() => z.object({ nested: z.number() })));
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['nested']);
    expectZodSchemaEqual(shape.nested, z.number());
  });

  it('unwraps z.lazy(() => z.optional(...))', () => {
    const schema = z.lazy(() => z.optional(z.object({ inner: z.string() })));
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['inner']);
    expectZodSchemaEqual(shape.inner, z.string());
  });

  it('handles deeply nested wrappers: optional(lazy(optional(lazy(...))))', () => {
    const schema = z.optional(
      z.lazy(() => z.optional(z.lazy(() => z.object({ deep: z.boolean() }))))
    );
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['deep']);
    expectZodSchemaEqual(shape.deep, z.boolean());
  });

  it('handles union inside optional(lazy(...))', () => {
    const schema = z.optional(
      z.lazy(() => z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]))
    );
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['a', 'b']);
  });

  it('returns {} for ZodNever', () => {
    expect(getShape(z.never())).toEqual({});
  });

  it('merges shapes from ZodIntersection', () => {
    const schema = z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() }));
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['a', 'b']);
  });

  it('merges shapes from ZodUnion', () => {
    const schema = z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]);
    const shape = getShape(schema);
    expect(Object.keys(shape)).toEqual(['a', 'b']);
  });
});
