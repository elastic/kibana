/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '.';
import { lazySchema, setLazySchemaDisabled } from './lazy_schema';

/**
 * Test Zod specific patterns
 */
describe('lazySchema', () => {
  it('forwards parse/safeParse and applies validation', () => {
    const schema = lazySchema(() =>
      z.object({ id: z.string(), count: z.number().int().min(0) }).strict()
    );

    expect(schema.parse({ id: 'a', count: 1 })).toEqual({ id: 'a', count: 1 });
    expect(schema.safeParse({ id: 'a', count: -1 }).success).toBe(false);
    expect(schema.safeParse({ id: 'a', count: 0, extra: 1 }).success).toBe(false);
  });

  it('supports z.infer<typeof lazySchema>', () => {
    const User = lazySchema(() => z.object({ id: z.string(), active: z.boolean() }));
    type User = z.infer<typeof User>;
    const sample: User = { id: 'x', active: true };

    expect(User.parse(sample)).toEqual(sample);
  });

  it('forwards .extend() on the underlying object schema', () => {
    const Base = lazySchema(() => z.object({ id: z.string() }));
    const Extended = Base.extend({ name: z.string() });

    expect(Extended.parse({ id: 'a', name: 'b' })).toEqual({ id: 'a', name: 'b' });
    expect(Extended.safeParse({ id: 'a' }).success).toBe(false);
  });

  it('works as a nested field of another schema', () => {
    const Inner = lazySchema(() => z.object({ value: z.number() }));
    const Outer = z.object({ inner: Inner, tag: z.string() });

    expect(Outer.parse({ inner: { value: 1 }, tag: 't' })).toEqual({
      inner: { value: 1 },
      tag: 't',
    });
    expect(Outer.safeParse({ inner: { value: 'not-a-number' }, tag: 't' }).success).toBe(false);
  });

  it('supports .optional() / .nullable() chained on the lazy schema', () => {
    const Inner = lazySchema(() => z.object({ value: z.number() }));
    const Outer = z.object({ inner: Inner.optional().nullable() });

    expect(Outer.parse({ inner: null }).inner).toBeNull();
    expect(Outer.parse({}).inner).toBeUndefined();
    expect(Outer.parse({ inner: { value: 1 } }).inner).toEqual({ value: 1 });
  });

  describe('generator-emitted patterns', () => {
    // Mirrors the z.discriminatedUnion + `as z.ZodType<Foo>` pattern the
    // openapi-generator emits for schemas whose inferred type exceeds the
    // TS serialization limit.
    it('supports the Internal + cast pattern', () => {
      const FooInternal = lazySchema(() =>
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('a'), value: z.number() }),
          z.object({ type: z.literal('b'), name: z.string() }),
        ])
      );
      type Foo = z.infer<typeof FooInternal>;
      const Foo = FooInternal as z.ZodType<Foo>;

      expect(Foo.parse({ type: 'a', value: 1 })).toEqual({ type: 'a', value: 1 });
      expect(Foo.parse({ type: 'b', name: 'x' })).toEqual({ type: 'b', name: 'x' });
      expect(Foo.safeParse({ type: 'c' }).success).toBe(false);
    });

    // Mirrors the circular-ref pattern: explicit z.ZodType<Node, NodeInput>
    // annotation on the exported const, with z.lazy(() => Node) inside.
    it('supports circular references via z.lazy inside the factory', () => {
      interface Node {
        value: number;
        next?: Node;
      }
      const Node: z.ZodType<Node> = lazySchema(
        () =>
          z.object({
            value: z.number(),
            next: z.lazy(() => Node).optional(),
          }) as z.ZodType<Node>
      );

      expect(Node.parse({ value: 1, next: { value: 2, next: { value: 3 } } })).toEqual({
        value: 1,
        next: { value: 2, next: { value: 3 } },
      });
      expect(Node.safeParse({ value: 1, next: { value: 'bad' } }).success).toBe(false);
    });

    // Mirrors the cross-schema reference pattern where one generated schema
    // references another generated schema that is itself lazy.
    it('supports a lazy schema referencing another lazy schema', () => {
      const Inner = lazySchema(() => z.object({ value: z.number() }));
      const Outer = lazySchema(() => z.object({ inner: Inner, tag: z.string() }));

      expect(Outer.parse({ inner: { value: 1 }, tag: 't' })).toEqual({
        inner: { value: 1 },
        tag: 't',
      });
      expect(Outer.safeParse({ inner: { value: 'x' }, tag: 't' }).success).toBe(false);
    });

    // Mirrors the .enum export pattern on enum-typed components.
    it('exposes .enum via the proxy for enum schemas', () => {
      const Color = lazySchema(() => z.enum(['red', 'green', 'blue']));
      const ColorEnum = Color.enum;

      expect(ColorEnum.red).toBe('red');
      expect(Color.parse('green')).toBe('green');
      expect(Color.safeParse('purple').success).toBe(false);
    });
  });

  describe('setLazySchemaDisabled', () => {
    // Always restore the default after each test — the toggle is a module-level
    // singleton and would otherwise leak across test files.
    afterEach(() => setLazySchemaDisabled(false));

    it('defers factory invocation by default (enabled)', () => {
      const factory = jest.fn(() => z.object({ id: z.string() }));
      const Schema = lazySchema(factory);

      expect(factory).not.toHaveBeenCalled();

      Schema.parse({ id: 'a' });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('calls the factory eagerly when disabled', () => {
      setLazySchemaDisabled(true);

      const factory = jest.fn(() => z.object({ id: z.string() }));
      lazySchema(factory);

      // No Proxy in this mode — the schema is constructed at wrap time.
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('returns the real schema (not a Proxy) when disabled', () => {
      setLazySchemaDisabled(true);

      const RawSchema = z.object({ id: z.string() });
      const Schema = lazySchema(() => RawSchema);

      // In disabled mode `lazySchema` just returns `factory()`, so the caller
      // gets the exact Zod instance back — `instanceof` succeeds.
      expect(Schema).toBe(RawSchema);
      expect(Schema).toBeInstanceOf(z.ZodObject);
    });
  });
});
