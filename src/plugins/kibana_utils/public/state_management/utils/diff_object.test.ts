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

import { cloneDeep } from 'lodash';
import { applyDiff } from './diff_object';

describe('diff_object', () => {
  test('should list the removed keys', () => {
    const target = { test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);

    expect(results).toHaveProperty('removed');
    expect(results.removed).toEqual(['test']);
  });

  test('should list the changed keys', () => {
    const target = { foo: 'bar' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);

    expect(results).toHaveProperty('changed');
    expect(results.changed).toEqual(['foo']);
  });

  test('should list the added keys', () => {
    const target = {};
    const source = { foo: 'test' };
    const results = applyDiff(target, source);

    expect(results).toHaveProperty('added');
    expect(results.added).toEqual(['foo']);
  });

  test('should list all the keys that are change or removed', () => {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test' };
    const results = applyDiff(target, source);

    expect(results).toHaveProperty('keys');
    expect(results.keys).toEqual(['foo', 'test']);
  });

  test('should ignore functions', () => {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', fn: () => {} };

    applyDiff(target, source);

    expect(target).not.toHaveProperty('fn');
  });

  test('should ignore underscores', () => {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', _private: 'foo' };

    applyDiff(target, source);

    expect(target).not.toHaveProperty('_private');
  });

  test('should ignore dollar signs', () => {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'test', $private: 'foo' };

    applyDiff(target, source);

    expect(target).not.toHaveProperty('$private');
  });

  test('should not list any changes for similar objects', () => {
    const target = { foo: 'bar', test: 'foo' };
    const source = { foo: 'bar', test: 'foo', $private: 'foo' };
    const results = applyDiff(target, source);

    expect(results.changed).toEqual([]);
  });

  test('should only change keys that actually changed', () => {
    const obj = { message: 'foo' };
    const target = { obj, message: 'foo' };
    const source = { obj: cloneDeep(obj), message: 'test' };

    applyDiff(target, source);

    expect(target.obj).toBe(obj);
  });
});
