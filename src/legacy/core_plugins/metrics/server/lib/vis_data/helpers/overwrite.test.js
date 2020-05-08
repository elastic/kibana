/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { set, isPlainObject } from './overwrite';

describe('isPlainObject', () => {
  test('should return true', () => {
    expect(isPlainObject(Object.create({}))).toBe(true);
    expect(isPlainObject(Object.create(Object.prototype))).toBe(true);
    expect(isPlainObject({ foo: 'bar' })).toBe(true);
    expect(isPlainObject({})).toBe(true);
  });
  test('should return false', () => {
    const Foo = jest.fn();
    expect(isPlainObject(/foo/)).toBe(false);
    expect(isPlainObject(function () {})).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject(['foo', 'bar'])).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(Foo)).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(Object.create(null))).toBe(false);
  });
});
describe('set', () => {
  test('should return non-objects', () => {
    let res = set('foo', 'a.b', 'c');
    expect(res).toEqual('foo');
    res = set(null, 'a.b', 'c');
    expect(res).toBeNull();
  });

  test('should create a nested property if it does not already exist', () => {
    const o = {};
    set(o, 'a.b', 'c');
    expect(o.a.b).toEqual('c');
  });

  test('should merge an existing value with the given value', () => {
    const o = { a: { b: { c: 'd' } } };
    set(o, 'a.b', { y: 'z' }, { merge: true });
    expect(o.a.b).toEqual({ c: 'd', y: 'z' });
  });

  test('should not split escaped dots', function () {
    const o = {};
    set(o, 'a\\.b.c.d.e', 'c', { escape: true });
    expect(o['a.b'].c.d.e).toEqual('c');
  });

  test('should work with multiple escaped dots', function () {
    const obj1 = {};
    set(obj1, 'e\\.f\\.g', 1, { escape: true });
    expect(obj1['e.f.g']).toEqual(1);

    const obj2 = {};
    set(obj2, 'e\\.f.g\\.h\\.i.j', 1, { escape: true });
    expect(obj2).toEqual({ 'e.f': { 'g.h.i': { j: 1 } } });
  });

  test('should work with escaped dots as the last character', function () {
    const o = {};
    set(o, 'a\\.b.c.d\\.e\\.', 'c', { escape: true });
    expect(o['a.b'].c['d.e.']).toEqual('c');
  });
});