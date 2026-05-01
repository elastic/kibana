/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOrResolveObject } from './get_or_resolve_object';

describe('getOrResolveObject', () => {
  const schema = {
    components: {
      schemas: {
        Foo: { type: 'object' },
      },
    },
  };

  it('resolves $ref starting with #', () => {
    const result = getOrResolveObject({ $ref: '#/components/schemas/Foo' }, schema);
    expect(result).toEqual({ type: 'object' });
  });

  it('returns object as-is when $ref does not start with #', () => {
    const obj = { $ref: 'http://external.com/schema' };
    expect(getOrResolveObject(obj, schema)).toBe(obj);
  });

  it('returns object as-is when no $ref key', () => {
    const obj = { type: 'string' };
    expect(getOrResolveObject(obj, schema)).toBe(obj);
  });

  it('returns null for null input', () => {
    expect(getOrResolveObject(null, schema)).toBeNull();
  });

  it('returns primitive as-is for non-object input', () => {
    expect(getOrResolveObject('hello', schema)).toBe('hello');
    expect(getOrResolveObject(42, schema)).toBe(42);
  });

  it('returns object as-is when $ref is not a string', () => {
    const obj = { $ref: 123 };
    expect(getOrResolveObject(obj, schema)).toBe(obj);
  });
});
