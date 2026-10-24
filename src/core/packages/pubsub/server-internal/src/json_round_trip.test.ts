/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findJsonRoundTripMismatch } from './json_round_trip';

const check = (data: unknown) => findJsonRoundTripMismatch(data, JSON.parse(JSON.stringify(data)));

describe('findJsonRoundTripMismatch', () => {
  it('accepts plain JSON data, nested and with optional properties left undefined', () => {
    expect(
      check({
        caseId: 'c-1',
        count: 3,
        ratio: -0.5,
        open: true,
        closedAt: null,
        tags: ['a', 'b'],
        nested: { deep: [{ ok: 1 }], missing: undefined },
        empty: {},
        noProto: Object.assign(Object.create(null), { ok: true }),
      })
    ).toBeUndefined();
  });

  it('names a Date and what it turns into', () => {
    expect(check({ createdAt: new Date(0) })).toBe(
      'data.createdAt is an instance of Date and arrives as a string'
    );
  });

  it('names a Map or Set, which JSON turns into an empty object', () => {
    expect(check({ tags: new Set(['a']) })).toBe(
      'data.tags is an instance of Set and arrives as an empty object'
    );
    expect(check({ byId: new Map([['a', 1]]) })).toBe(
      'data.byId is an instance of Map and arrives as an empty object'
    );
  });

  it('rejects class instances even when their own fields would survive, since the consumer type lies', () => {
    class Order {
      constructor(public readonly id: string) {}
      public describe() {
        return this.id;
      }
    }

    expect(check({ order: new Order('o-1') })).toBe(
      'data.order is an instance of Order and arrives as a plain object'
    );
  });

  it('names an undefined array item, which JSON turns into null', () => {
    expect(check({ tags: ['a', undefined, 'c'] })).toBe(
      'data.tags[1] is undefined and arrives as null'
    );
  });

  it('names a function property, which JSON drops', () => {
    expect(check({ onDone: () => {} })).toBe(
      'data.onDone is a function and arrives as nothing (the property is dropped)'
    );
  });

  it('names non-finite numbers, which JSON turns into null', () => {
    expect(check({ ratio: NaN })).toBe('data.ratio is NaN and arrives as null');
    expect(check({ nested: { max: Infinity } })).toBe(
      'data.nested.max is Infinity and arrives as null'
    );
  });

  it('reports the first mismatch along a deep path', () => {
    expect(check({ a: [{ b: { c: [1, { d: new Date(0) }] } }] })).toBe(
      'data.a[0].b.c[1].d is an instance of Date and arrives as a string'
    );
  });

  it('rejects a non-object root', () => {
    expect(check(new Date(0))).toBe('data is an instance of Date and arrives as a string');
  });
});
