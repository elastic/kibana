/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

const assert = require('assert');

const setFunctions = [require('../').set, require('../set')];
const setWithFunctions = [require('../').setWith, require('../setWith')];
const setAndSetWithFunctions = [].concat(setFunctions, setWithFunctions);

setAndSetWithFunctions.forEach((set) => {
  /**
   * GENERAL USAGE TESTS
   */

  // Returns same object
  {
    const o1 = {};
    const o2 = set(o1, 'foo', 'bar');
    assert.strictEqual(o1, o2);
  }

  assert.strictEqual(set(null, 'a.b', 'foo'), null);
  assert.strictEqual(set(undefined, 'a.b', 'foo'), undefined);
  assert.strictEqual(set(NaN, 'a.b', 'foo'), NaN);
  assert.strictEqual(set(42, 'a.b', 'foo'), 42);

  // Overwrites existing object properties
  assert.deepStrictEqual(set({ a: { b: { c: 3 } } }, 'a.b', 'foo'), { a: { b: 'foo' } });

  // Adds missing properties without touching other areas
  assert.deepStrictEqual(
    set({ a: [{ aa: { aaa: 3, aab: 4 } }, { ab: 2 }], b: 1 }, 'a[0].aa.aaa.aaaa', 'foo'),
    { a: [{ aa: { aaa: { aaaa: 'foo' }, aab: 4 } }, { ab: 2 }], b: 1 }
  );

  // Overwrites existing elements in array
  assert.deepStrictEqual(set({ a: [1, 2, 3] }, 'a[1]', 'foo'), { a: [1, 'foo', 3] });

  // Create new array
  assert.deepStrictEqual(set({}, ['x', '0', 'y', 'z'], 'foo'), { x: [{ y: { z: 'foo' } }] });

  /**
   * PROTOTYPE POLLUTION PROTECTION TESTS
   */

  const testCases = [
    ['__proto__', { ['__proto__']: 'foo' }],
    ['.__proto__', { '': { ['__proto__']: 'foo' } }],
    ['o.__proto__', { o: { ['__proto__']: 'foo' } }],
    ['a[0].__proto__', { a: [{ ['__proto__']: 'foo' }] }],

    ['constructor', { constructor: 'foo' }],
    ['.constructor', { '': { constructor: 'foo' } }],
    ['o.constructor', { o: { constructor: 'foo' } }],
    ['a[0].constructor', { a: [{ constructor: 'foo' }] }],

    ['constructor.something', { constructor: { something: 'foo' } }],
    ['.constructor.something', { '': { constructor: { something: 'foo' } } }],
    ['o.constructor.something', { o: { constructor: { something: 'foo' } } }],
    ['a[0].constructor.something', { a: [{ constructor: { something: 'foo' } }] }],

    ['prototype', { prototype: 'foo' }],
    ['.prototype', { '': { prototype: 'foo' } }],
    ['o.prototype', { o: { prototype: 'foo' } }],
    ['a[0].prototype', { a: [{ prototype: 'foo' }] }],

    ['constructor.prototype', { constructor: { prototype: 'foo' } }],
    ['.constructor.prototype', { '': { constructor: { prototype: 'foo' } } }],
    ['o.constructor.prototype', { o: { constructor: { prototype: 'foo' } } }],
    ['a[0].constructor.prototype', { a: [{ constructor: { prototype: 'foo' } }] }],

    ['constructor.something.prototype', { constructor: { something: { prototype: 'foo' } } }],
    [
      '.constructor.something.prototype',
      { '': { constructor: { something: { prototype: 'foo' } } } },
    ],
    [
      'o.constructor.something.prototype',
      { o: { constructor: { something: { prototype: 'foo' } } } },
    ],
    [
      'a[0].constructor.something.prototype',
      { a: [{ constructor: { something: { prototype: 'foo' } } }] },
    ],
  ];

  // Object manipulation
  testCases.forEach(([path, expected]) => {
    assert.deepStrictEqual(set({}, path, 'foo'), expected);
  });

  // Array manipulation
  testCases.forEach(([path, expected]) => {
    const arr = [];
    set(arr, path, 'foo');
    Object.keys(expected).forEach((key) => {
      assert(Object.prototype.hasOwnProperty.call(arr, key));
      assert.deepStrictEqual(arr[key], expected[key]);
    });
  });

  // Function manipulation
  {
    const funcTestCases = [
      [function () {}, 'prototype'],
      [() => {}, 'prototype'],
      [{ fn: function () {} }, 'fn.prototype'],
      [{ fn: () => {} }, 'fn.prototype'],
    ];
    funcTestCases.forEach(([obj, path]) => {
      assert.throws(
        () => {
          set(obj, path, 'foo');
        },
        {
          message: 'Illegal access of function prototype',
        }
      );
    });
  }
});

/**
 * setWith specific tests
 */

setWithFunctions.forEach((setWith) => {
  // Return undefined
  assert.deepStrictEqual(
    setWith({}, 'a.b', 'foo', () => {}),
    { a: { b: 'foo' } }
  );

  // Customizer arguments
  {
    const expectedCustomizerArgs = [
      [{ b: 42 }, 'a', { a: { b: 42 } }],
      [42, 'b', { b: 42 }],
    ];

    assert.deepStrictEqual(
      setWith({ a: { b: 42 } }, 'a.b.c', 'foo', (...args) => {
        assert.deepStrictEqual(args, expectedCustomizerArgs.shift());
      }),
      { a: { b: { c: 'foo' } } }
    );
  }

  // Return value
  assert.deepStrictEqual(setWith({}, '[0][1]', 'a', Object), { 0: { 1: 'a' } });
});
