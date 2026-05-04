/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '.';

/**
 * Proves that the auto-bind getter patch installed by patches/zod+4.3.6.patch
 * makes detached builder method calls work correctly.
 *
 * Without the patch `const opt = schema.optional; opt()` would fail because
 * the method would be called with `this === undefined` (strict mode) or the
 * global object, rather than the schema instance.
 */
describe('zod memory patch — detached method calls', () => {
  it('const opt = schema.optional; opt() returns a valid ZodOptional', () => {
    const schema = z.string();
    const opt = schema.optional;
    const result = opt();
    expect(result.safeParse(undefined).success).toBe(true);
    expect(result.safeParse('hello').success).toBe(true);
    expect(result.safeParse(42).success).toBe(false);
  });

  it('const { nullable } = schema; nullable() returns a valid ZodNullable', () => {
    const { nullable } = z.number();
    const result = nullable();
    expect(result.safeParse(null).success).toBe(true);
    expect(result.safeParse(42).success).toBe(true);
    expect(result.safeParse('x').success).toBe(false);
  });

  it('inline call still works (regression guard)', () => {
    const schema = z.string();
    const result = schema.optional();
    expect(result.safeParse(undefined).success).toBe(true);
    expect(result.safeParse('hello').success).toBe(true);
  });

  it('detached parse works (parse is a per-instance closure, not a getter)', () => {
    const { parse } = z.string();
    expect(parse('hello')).toBe('hello');
    expect(() => parse(42)).toThrow();
  });

  it('repeated accesses to the same method return the same bound function (lazy-cache)', () => {
    const schema = z.string();
    // Colin's lazy-bind approach caches the bound fn as an own property on
    // the instance on first access — subsequent accesses skip the getter and
    // return the same reference.  This is strictly better than creating a new
    // bound fn on every access.
    const fn1 = schema.optional;
    const fn2 = schema.optional;
    expect(fn1).toBe(fn2);
    expect(fn1()).toBeDefined();
  });
});
