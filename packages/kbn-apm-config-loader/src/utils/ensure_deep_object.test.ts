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

import { ensureDeepObject } from './ensure_deep_object';

test('flat object', () => {
  const obj = {
    'foo.a': 1,
    'foo.b': 2,
  };

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      a: 1,
      b: 2,
    },
  });
});

test('deep object', () => {
  const obj = {
    foo: {
      a: 1,
      b: 2,
    },
  };

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      a: 1,
      b: 2,
    },
  });
});

test('flat within deep object', () => {
  const obj = {
    foo: {
      b: 2,
      'bar.a': 1,
    },
  };

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      b: 2,
      bar: {
        a: 1,
      },
    },
  });
});

test('flat then flat object', () => {
  const obj = {
    'foo.bar': {
      b: 2,
      'quux.a': 1,
    },
  };

  expect(ensureDeepObject(obj)).toEqual({
    foo: {
      bar: {
        b: 2,
        quux: {
          a: 1,
        },
      },
    },
  });
});

test('full with empty array', () => {
  const obj = {
    a: 1,
    b: [],
  };

  expect(ensureDeepObject(obj)).toEqual({
    a: 1,
    b: [],
  });
});

test('full with array of primitive values', () => {
  const obj = {
    a: 1,
    b: [1, 2, 3],
  };

  expect(ensureDeepObject(obj)).toEqual({
    a: 1,
    b: [1, 2, 3],
  });
});

test('full with array of full objects', () => {
  const obj = {
    a: 1,
    b: [{ c: 2 }, { d: 3 }],
  };

  expect(ensureDeepObject(obj)).toEqual({
    a: 1,
    b: [{ c: 2 }, { d: 3 }],
  });
});

test('full with array of flat objects', () => {
  const obj = {
    a: 1,
    b: [{ 'c.d': 2 }, { 'e.f': 3 }],
  };

  expect(ensureDeepObject(obj)).toEqual({
    a: 1,
    b: [{ c: { d: 2 } }, { e: { f: 3 } }],
  });
});

test('flat with flat and array of flat objects', () => {
  const obj = {
    a: 1,
    'b.c': 2,
    d: [3, { 'e.f': 4 }, { 'g.h': 5 }],
  };

  expect(ensureDeepObject(obj)).toEqual({
    a: 1,
    b: { c: 2 },
    d: [3, { e: { f: 4 } }, { g: { h: 5 } }],
  });
});

test('array composed of flat objects', () => {
  const arr = [{ 'c.d': 2 }, { 'e.f': 3 }];

  expect(ensureDeepObject(arr)).toEqual([{ c: { d: 2 } }, { e: { f: 3 } }]);
});
