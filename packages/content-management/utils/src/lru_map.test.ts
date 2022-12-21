/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LruMap } from './lru_map';

describe('LruMap', () => {
  test('.get() / .set() / .size', () => {
    const lru = new LruMap(123);
    lru.set('foo', 1);
    expect(lru.size).toBe(1);
    lru.set('bar', 2);
    expect(lru.get('foo')).toBe(1);
    expect(lru.get('bar')).toBe(2);
    expect(lru.size).toBe(2);
  });

  test('keeps limit', () => {
    const lru = new LruMap(2);
    lru.set('1', 1);
    expect(lru.size).toBe(1);
    lru.set('2', 2);
    expect(lru.size).toBe(2);
    lru.set('3', 3);
    expect(lru.size).toBe(2);
    lru.set('4', 4);
    expect(lru.size).toBe(2);
    expect(lru.get('1')).toBe(undefined);
    expect(lru.get('2')).toBe(undefined);
    expect(lru.get('3')).toBe(3);
    expect(lru.get('4')).toBe(4);
  });

  test('rotates keys on .get()', () => {
    const lru = new LruMap(3);
    lru.set('1', 1);
    expect(lru.size).toBe(1);
    lru.set('2', 2);
    expect(lru.size).toBe(2);
    lru.set('3', 3);
    expect(lru.size).toBe(3);
    expect(lru.get('2')).toBe(2);
    lru.set('4', 4);
    expect(lru.size).toBe(3);
    expect(lru.get('1')).toBe(undefined);
    expect(lru.get('2')).toBe(2);
  });

  test('rotates keys on .set()', () => {
    const lru = new LruMap(3);
    lru.set('1', 1);
    expect(lru.size).toBe(1);
    lru.set('2', 2);
    expect(lru.size).toBe(2);
    lru.set('3', 3);
    expect(lru.size).toBe(3);
    lru.set('2', 2);
    lru.set('4', 4);
    expect(lru.size).toBe(3);
    expect(lru.get('1')).toBe(undefined);
    expect(lru.get('2')).toBe(2);
  });

  test('should drop key least used on max size', () => {
    const cache = new LruMap(3);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
    cache.set('d', '4');
    expect(cache.get('d')).toBe('4');
    expect(cache.get('a')).toBe(undefined);
    cache.get('b');
    cache.set('e', '5');
    expect(cache.get('b')).toBe('2');
    expect(cache.get('e')).toBe('5');
    expect(cache.get('c')).toBe(undefined);
  });

  test('should remove all objects on reset', () => {
    const cache = new LruMap(3);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.size).toBe(3);
    expect([...cache.keys()].length).toBe(3);
    cache.clear();
    expect(cache.size).toBe(0);
    expect([...cache.keys()].length).toBe(0);
  });
});
