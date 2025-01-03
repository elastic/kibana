/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

describe('forbidden patterns', () => {
  describe('first pattern', () => {
    test('throws when finding the first pattern within an object', () => {
      const obj = {
        foo: {
          hello: 'dolly',
          'bar.__proto__': { yours: 'mine' },
        },
      };

      expect(() => ensureDeepObject(obj)).toThrowErrorMatchingInlineSnapshot(
        `"Forbidden path detected: foo.bar.__proto__"`
      );
    });

    test('throws when finding the first pattern within an array', () => {
      const obj = {
        array: [
          'hello',
          {
            'bar.__proto__': { their: 'mine' },
          },
        ],
      };

      expect(() => ensureDeepObject(obj)).toThrowErrorMatchingInlineSnapshot(
        `"Forbidden path detected: array.1.bar.__proto__"`
      );
    });
  });

  describe('second pattern', () => {
    test('throws when finding the first pattern within an object', () => {
      const obj = {
        foo: {
          hello: 'dolly',
          'bar.constructor.prototype': { foo: 'bar' },
        },
      };

      expect(() => ensureDeepObject(obj)).toThrowErrorMatchingInlineSnapshot(
        `"Forbidden path detected: foo.bar.constructor.prototype"`
      );
    });

    test('throws when finding the first pattern within a nested object', () => {
      const obj = {
        foo: {
          hello: 'dolly',
          'bar.constructor': {
            main: 'mine',
            prototype: 'nope',
          },
        },
      };

      expect(() => ensureDeepObject(obj)).toThrowErrorMatchingInlineSnapshot(
        `"Forbidden path detected: foo.bar.constructor.prototype"`
      );
    });

    test('throws when finding the first pattern within an array', () => {
      const obj = {
        array: [
          'hello',
          {
            'bar.constructor.prototype': { foo: 'bar' },
          },
        ],
      };

      expect(() => ensureDeepObject(obj)).toThrowErrorMatchingInlineSnapshot(
        `"Forbidden path detected: array.1.bar.constructor.prototype"`
      );
    });
  });
});
