/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pickObjectFields } from './pick_object_fields';

describe('pickObjectFields', () => {
  it('keeps only the requested top-level fields', () => {
    expect(pickObjectFields({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('picks nested fields by dotted path and preserves structure', () => {
    const source = { host: { name: 'h1', os: { name: 'linux', version: '5' } } };
    expect(pickObjectFields(source, ['host.name', 'host.os.name'])).toEqual({
      host: { name: 'h1', os: { name: 'linux' } },
    });
  });

  it('preserves value types (numbers, booleans, arrays) rather than stringifying', () => {
    const source = { risk_score: 73, enabled: true, args: ['-a', '-b'] };
    expect(pickObjectFields(source, ['risk_score', 'enabled', 'args'])).toEqual({
      risk_score: 73,
      enabled: true,
      args: ['-a', '-b'],
    });
  });

  it('skips absent paths without creating empty keys', () => {
    expect(pickObjectFields({ a: 1 }, ['a', 'b.c'])).toEqual({ a: 1 });
  });

  it('skips a path that traverses through a non-object', () => {
    expect(pickObjectFields({ a: 1 }, ['a.b'])).toEqual({});
  });

  it('does not mutate the source object', () => {
    const source = { a: { b: 1 } };
    pickObjectFields(source, ['a']);
    expect(source).toEqual({ a: { b: 1 } });
  });

  it('returns a deep clone so mutating the result leaves the source untouched', () => {
    const source = { a: { b: 1 } };
    const result = pickObjectFields(source, ['a']) as { a: { b: number } };
    result.a.b = 999;
    expect(source.a.b).toBe(1);
  });

  it('returns a non-object source unchanged', () => {
    expect(pickObjectFields('not-an-object', ['a'])).toBe('not-an-object');
  });

  it('returns an empty object when no paths are provided', () => {
    expect(pickObjectFields({ a: 1 }, [])).toEqual({});
  });

  it('picks a field from an array element by numeric index', () => {
    const source = { users: [{ name: 'a', age: 1 }, { name: 'b' }] };
    expect(pickObjectFields(source, ['users.0.name'])).toEqual({ users: [{ name: 'a' }] });
  });

  it('merges picks across array indices into one array', () => {
    const source = {
      users: [
        { name: 'a', age: 1 },
        { name: 'b', age: 2 },
      ],
    };
    expect(pickObjectFields(source, ['users.0.name', 'users.1.age'])).toEqual({
      users: [{ name: 'a' }, { age: 2 }],
    });
  });

  it('preserves the original index when picking a later array element', () => {
    const source = { users: [{ name: 'a' }, { name: 'b' }] };
    // A sparse pick keeps element 1 at index 1; the hole serializes as null.
    expect(JSON.stringify(pickObjectFields(source, ['users.1.name']))).toBe(
      '{"users":[null,{"name":"b"}]}'
    );
  });

  it('skips an out-of-bounds array index', () => {
    expect(pickObjectFields({ users: [{ name: 'a' }] }, ['users.5.name'])).toEqual({});
  });

  it('skips paths containing prototype-pollution segments', () => {
    // A source with own `__proto__`/`constructor` keys, as JSON.parse produces.
    const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"polluted":true}}');
    expect(
      pickObjectFields(source, ['__proto__.polluted', 'constructor.polluted', 'prototype.x'])
    ).toEqual({});
  });

  it('does not pollute Object.prototype through a crafted path', () => {
    const source = JSON.parse('{"__proto__":{"polluted":true}}');
    pickObjectFields(source, ['__proto__.polluted']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
