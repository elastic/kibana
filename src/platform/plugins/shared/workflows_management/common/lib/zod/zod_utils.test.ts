/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  expectZodSchemaEqual,
  getSchemaAtPath,
  inferZodType,
  isValidSchemaPath,
} from './zod_utils';
import { z } from '@kbn/zod';

describe('isValidSchemaPath', () => {
  it('should return true for simple paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.string() }), 'a')).toBe(true);
  });

  it('should return false for invalid paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.string() }), 'b')).toBe(false);
  });

  it('should return true for nested paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.object({ b: z.string() }) }), 'a.b')).toBe(true);
  });

  it('should return true for array paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[0]')).toBe(true);
  });

  it('should return false for array paths with invalid index', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).length(5) }), 'a[10]')).toBe(false);
  });

  it('should return true for unconstrained arrays with any valid index', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[0]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[100]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[999]')).toBe(true);
  });

  it('should return false for negative array indices', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()) }), 'a[-1]')).toBe(false);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).length(5) }), 'a[-1]')).toBe(false);
  });

  it('should respect max length constraints', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).max(3) }), 'a[2]')).toBe(true);
    expect(isValidSchemaPath(z.object({ a: z.array(z.string()).max(3) }), 'a[3]')).toBe(false);
  });

  it('should return true for nested array/object paths', () => {
    expect(isValidSchemaPath(z.object({ a: z.array(z.object({ b: z.string() })) }), 'a[0].b')).toBe(
      true
    );
  });

  it('should return true for union paths', () => {
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'a')
    ).toBe(true);
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'b')
    ).toBe(true);
    expect(
      isValidSchemaPath(z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]), 'c')
    ).toBe(false);
    expect(isValidSchemaPath(z.union([z.object({ a: z.string() }), z.any()]), 'c')).toBe(true);
  });

  it('should return true for union paths array', () => {
    expect(
      isValidSchemaPath(
        z.object({ alerts: z.array(z.union([z.object({ a: z.string() }), z.any()])) }),
        'alerts[0].a'
      )
    ).toBe(true);
    expect(
      isValidSchemaPath(
        z.object({ alerts: z.array(z.union([z.object({ a: z.string() }), z.any()])) }),
        'alerts[0].b'
      )
    ).toBe(true);
  });
});

describe('getSchemaAtPath', () => {
  it('should return the correct type for simple paths', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.string() }), 'a') as z.ZodType,
      z.string()
    );
  });

  it('should return the correct type for nested paths', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.object({ b: z.array(z.string()) }) }), 'a.b[0]') as z.ZodType,
      z.string()
    );
  });

  it('should return null for array paths with invalid index', () => {
    expect(getSchemaAtPath(z.object({ a: z.array(z.string()).length(5) }), 'a[10]')).toBeNull();
  });

  it('should return element schema for unconstrained arrays', () => {
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[0]') as z.ZodType,
      z.string()
    );
    expectZodSchemaEqual(
      getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[999]') as z.ZodType,
      z.string()
    );
  });

  it('should return null for negative indices', () => {
    expect(getSchemaAtPath(z.object({ a: z.array(z.string()) }), 'a[-1]')).toBeNull();
  });

  it('should return null for invalid paths', () => {
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'b')).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a.b')).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a[1]')).toBeNull();
    expect(getSchemaAtPath(z.object({ a: z.string() }), 'a[0].b')).toBeNull();
  });
});

describe('inferZodType', () => {
  it('should return the correct type', () => {
    expectZodSchemaEqual(
      inferZodType({ a: 'b', c: 1, d: true, e: [1, 2, 3], f: { g: 'h' } }),
      z.object({
        a: z.string(),
        c: z.number(),
        d: z.boolean(),
        e: z.array(z.number()).length(3),
        f: z.object({ g: z.string() }),
      })
    );
  });
});
