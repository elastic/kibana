/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectType } from 'tsd';

import {
  isSmartIntersection,
  MAX_UNION_OBJECT_NESTING_DEPTH,
  smartIntersection,
  smartIntersectionWith,
  z,
} from '..';

describe('smartIntersectionWith', () => {
  it('marks the returned schema as a smart intersection', () => {
    const schema = smartIntersectionWith(
      z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
      { c: z.number() }
    );

    expect(isSmartIntersection(schema)).toBe(true);
  });

  it('extends a single object schema', () => {
    const schema = smartIntersectionWith(z.object({ a: z.string() }).strict(), {
      c: z.number(),
    });

    type Type = z.output<typeof schema>;
    expectType<Type>({ a: 'x', c: 1 });
    // @ts-expect-error - missing required field
    expectType<Type>({ a: 'x' });

    expect(isSmartIntersection(schema)).toBe(true);
    expect(schema.safeParse({ a: 'x', c: 1 })).toEqual({
      success: true,
      data: { a: 'x', c: 1 },
    });
    expect(schema.safeParse({ a: 'x', c: 1, extra: true }).success).toBe(false);
  });

  it('extends a discriminated union of object types', () => {
    const schema = smartIntersectionWith(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), a: z.string() }).strict(),
        z.object({ type: z.literal('b'), b: z.number() }).strict(),
      ]),
      { c: z.number() }
    );

    type Type = z.output<typeof schema>;
    expectType<Type>({ type: 'a', a: 'x', c: 1 });
    expectType<Type>({ type: 'b', b: 1, c: 2 });

    expect(schema.safeParse({ type: 'a', a: 'x', c: 1 })).toEqual({
      success: true,
      data: { type: 'a', a: 'x', c: 1 },
    });
    expect(schema.safeParse({ type: 'b', b: 1, c: 2 })).toEqual({
      success: true,
      data: { type: 'b', b: 1, c: 2 },
    });
    expect(schema.safeParse({ type: 'a', a: 'x', c: 1, extra: true }).success).toBe(false);
  });

  it('throws when the base schema is not an object or union of objects', () => {
    expect(() => smartIntersectionWith(z.string(), { c: z.number() })).toThrow(
      'expected an object or union of object types'
    );
  });

  it('throws when a union option is not an object or nested object union', () => {
    expect(() =>
      smartIntersectionWith(z.union([z.object({ a: z.string() }), z.string()]), {
        c: z.number(),
      })
    ).toThrow('union option must be an object type or nested union of object types');
  });

  it('throws when nested object unions exceed the maximum depth', () => {
    let nestedUnion = z.union([
      z.object({ leaf: z.literal('a') }),
      z.object({ leaf: z.literal('b') }),
    ]);

    for (let depth = 1; depth <= MAX_UNION_OBJECT_NESTING_DEPTH + 1; depth++) {
      nestedUnion = z.union([nestedUnion, z.object({ level: z.literal(depth) })]) as any;
    }

    expect(() => smartIntersectionWith(nestedUnion, { shared: z.number() })).toThrow(
      `nested object unions exceed maximum depth of ${MAX_UNION_OBJECT_NESTING_DEPTH}`
    );
  });

  it('flattens nested unions of object types up to the maximum depth', () => {
    const nestedUnion = z.union([
      z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
      z.object({ c: z.boolean() }),
    ]);

    const schema = smartIntersectionWith(nestedUnion, { shared: z.number() });

    expect(schema.safeParse({ a: 'x', shared: 1 }).success).toBe(true);
    expect(schema.safeParse({ b: 1, shared: 2 }).success).toBe(true);
    expect(schema.safeParse({ c: true, shared: 3 }).success).toBe(true);
  });

  it('parses strict union members with shared fields without unrecognized key errors', () => {
    const schema = smartIntersectionWith(
      z.union([
        z.object({ a: z.string(), type: z.literal('a') }).strict(),
        z.object({ b: z.number(), type: z.literal('b') }).strict(),
      ]),
      { c: z.number() }
    );

    type Type = z.output<typeof schema>;
    expectType<Type>({ type: 'a', a: 'x', c: 1 });
    expectType<Type>({ type: 'b', b: 1, c: 2 });
    // @ts-expect-error - extra field
    expectType<Type>({ type: 'b', b: 1, c: 2, extra: true });

    expect(schema.safeParse({ a: 'x', type: 'a', c: 1 })).toEqual({
      success: true,
      data: { a: 'x', type: 'a', c: 1 },
    });
    expect(schema.safeParse({ a: 'x', type: 'a', c: 1, extra: true }).success).toBe(false);
  });

  it('handles five layers of nested object unions inside object properties', () => {
    let innerUnion = z.union([
      z.object({ l5a: z.string() }).strict(),
      z.object({ l5b: z.number() }).strict(),
    ]);

    for (let level = 4; level >= 1; level--) {
      innerUnion = z.union([
        z.object({ [`l${level}a`]: z.string(), nested: innerUnion }).strict(),
        z.object({ [`l${level}b`]: z.number() }).strict(),
      ]) as any;
    }

    const schema = smartIntersectionWith(innerUnion, { shared: z.number() });

    expect(
      schema.safeParse({
        l1a: 'x',
        nested: {
          l2a: 'y',
          nested: {
            l3a: 'z',
            nested: {
              l4a: 'w',
              nested: {
                l5a: 'v',
              },
            },
          },
        },
        shared: 1,
      }).success
    ).toBe(true);
  });

  it('emits anyOf branches instead of an allOf-wrapped union for OpenAPI', () => {
    const schema = smartIntersectionWith(
      z.union([
        z.object({ a: z.string() }).meta({ id: 'SchemaA' }),
        z.object({ b: z.number() }).meta({ id: 'SchemaB' }),
      ]),
      { c: z.number() }
    );

    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;

    expect(jsonSchema.allOf).toBeUndefined();
    expect(Array.isArray(jsonSchema.anyOf)).toBe(true);
    expect(jsonSchema.anyOf).toHaveLength(2);

    for (const branch of jsonSchema.anyOf as Record<string, unknown>[]) {
      expect(Array.isArray(branch.allOf)).toBe(true);
      expect((branch.allOf as Record<string, unknown>[])[0]).toEqual({
        $ref: expect.stringMatching(/^#\/(\$defs|components\/schemas)\//),
      });
    }
  });

  it('preserves component refs for union members registered with meta ids', () => {
    const schema = smartIntersectionWith(
      z.union([
        z
          .object({ a: z.string(), type: z.literal('a') })
          .strict()
          .meta({ id: 'SchemaA' }),
        z
          .object({ b: z.number(), type: z.literal('b') })
          .strict()
          .meta({ id: 'SchemaB' }),
      ]),
      { c: z.number() }
    );

    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as {
      anyOf: Array<{ allOf: Array<{ $ref?: string }> }>;
      $defs?: Record<string, unknown>;
    };

    const refs = jsonSchema.anyOf.map((branch) => branch.allOf[0].$ref);
    expect(refs).toEqual(expect.arrayContaining(['#/$defs/SchemaA', '#/$defs/SchemaB']));
    expect(jsonSchema.$defs?.SchemaA).toBeDefined();
    expect(jsonSchema.$defs?.SchemaB).toBeDefined();
  });

  it('preserves component refs when extending a single object with meta id', () => {
    const schema = smartIntersectionWith(
      z.object({ a: z.string() }).strict().meta({ id: 'SchemaA' }),
      { c: z.number() }
    );

    const jsonSchema = z.toJSONSchema(schema, { io: 'input' });

    expect(jsonSchema.allOf?.[0]?.$ref).toBe('#/$defs/SchemaA');
    expect(jsonSchema.$defs?.SchemaA).toBeDefined();
    expect(jsonSchema.anyOf).toBeUndefined();
  });
});

describe('smartIntersection', () => {
  it('intersects with a shared object schema', () => {
    const sharedSchema = z.object({ c: z.number(), label: z.string().optional() }).strict();

    const schema = smartIntersection(
      z.union([
        z.object({ a: z.string(), type: z.literal('a') }).strict(),
        z.object({ b: z.number(), type: z.literal('b') }).strict(),
      ]),
      sharedSchema
    );

    expect(schema.safeParse({ a: 'x', type: 'a', c: 1, label: 'foo' })).toEqual({
      success: true,
      data: { a: 'x', type: 'a', c: 1, label: 'foo' },
    });
    expect(schema.safeParse({ a: 'x', type: 'a', c: 1, extra: true }).success).toBe(false);
  });

  it('throws when the shared schema is not an object type', () => {
    expect(() =>
      smartIntersection(z.object({ a: z.string() }), z.union([z.string(), z.number()]) as any)
    ).toThrow('shared schema must be an object type');
  });

  it('preserves meta id on the shared schema in OpenAPI output', () => {
    const sharedSchema = z.object({ c: z.number() }).strict().meta({ id: 'SharedSchema' });

    const schema = smartIntersection(
      z.object({ a: z.string() }).strict().meta({ id: 'SchemaA' }),
      sharedSchema
    );

    const jsonSchema = z.toJSONSchema(schema, { io: 'input' }) as {
      allOf: Array<{ $ref?: string }>;
      $defs?: Record<string, unknown>;
    };

    expect(jsonSchema.allOf.map((branch) => branch.$ref)).toEqual(
      expect.arrayContaining(['#/$defs/SchemaA', '#/$defs/SharedSchema'])
    );
    expect(jsonSchema.$defs?.SharedSchema).toBeDefined();
  });
});
