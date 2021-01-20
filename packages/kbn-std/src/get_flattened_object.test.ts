/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getFlattenedObject } from './get_flattened_object';

describe('getFlattenedObject()', () => {
  it('throws when rootValue is not an object or is an array', () => {
    expect(() => getFlattenedObject(1 as any)).toThrowError();
    expect(() => getFlattenedObject(Infinity as any)).toThrowError();
    expect(() => getFlattenedObject(NaN as any)).toThrowError();
    expect(() => getFlattenedObject(false as any)).toThrowError();
    expect(() => getFlattenedObject(null as any)).toThrowError();
    expect(() => getFlattenedObject(undefined as any)).toThrowError();
    expect(() => getFlattenedObject([])).toThrowError();
  });

  it('flattens objects', () => {
    expect(getFlattenedObject({ a: 'b' })).toEqual({ a: 'b' });
    expect(getFlattenedObject({ a: { b: 'c' } })).toEqual({ 'a.b': 'c' });
    expect(getFlattenedObject({ a: { b: 'c' }, d: { e: 'f' } })).toEqual({
      'a.b': 'c',
      'd.e': 'f',
    });
  });

  it('does not flatten arrays', () => {
    expect(getFlattenedObject({ a: ['b'] })).toEqual({ a: ['b'] });
    expect(getFlattenedObject({ a: { b: ['c', 'd'] } })).toEqual({ 'a.b': ['c', 'd'] });
  });
});
