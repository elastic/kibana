/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
