/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

const test = require('tape');

const setFunctions = [
  [require('..').set, 'module.set'],
  [require('../set'), 'module/set'],
];
const setWithFunctions = [
  [require('..').setWith, 'module.setWith'],
  [require('../setWith'), 'module/setWith'],
];
const setAndSetWithFunctions = [].concat(setFunctions, setWithFunctions);

setAndSetWithFunctions.forEach(([set, testName]) => {
  /**
   * GENERAL USAGE TESTS
   */

  test(`${testName}: Returns same object`, (t) => {
    const o1 = {};
    const o2 = set(o1, 'foo', 'bar');
    t.strictEqual(o1, o2);
    t.end();
  });

  test(`${testName}: Non-objects`, (t) => {
    t.strictEqual(set(null, 'a.b', 'foo'), null);
    t.strictEqual(set(undefined, 'a.b', 'foo'), undefined);
    t.strictEqual(set(NaN, 'a.b', 'foo'), NaN);
    t.strictEqual(set(42, 'a.b', 'foo'), 42);
    t.end();
  });

  test(`${testName}: Overwrites existing object properties`, (t) => {
    t.deepEqual(set({ a: { b: { c: 3 } } }, 'a.b', 'foo'), { a: { b: 'foo' } });
    t.end();
  });

  test(`${testName}: Adds missing properties without touching other areas`, (t) => {
    t.deepEqual(
      set({ a: [{ aa: { aaa: 3, aab: 4 } }, { ab: 2 }], b: 1 }, 'a[0].aa.aaa.aaaa', 'foo'),
      { a: [{ aa: { aaa: { aaaa: 'foo' }, aab: 4 } }, { ab: 2 }], b: 1 }
    );
    t.end();
  });

  test(`${testName}: Overwrites existing elements in array`, (t) => {
    t.deepEqual(set({ a: [1, 2, 3] }, 'a[1]', 'foo'), { a: [1, 'foo', 3] });
    t.end();
  });

  test(`${testName}: Create new array`, (t) => {
    t.deepEqual(set({}, ['x', '0', 'y', 'z'], 'foo'), { x: [{ y: { z: 'foo' } }] });
    t.end();
  });

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

  testCases.forEach(([path, expected]) => {
    test(`${testName}: Object manipulation, ${path}`, (t) => {
      t.deepEqual(set({}, path, 'foo'), expected);
      t.end();
    });
  });

  testCases.forEach(([path, expected]) => {
    test(`${testName}: Array manipulation, ${path}`, (t) => {
      const arr = [];
      set(arr, path, 'foo');
      Object.keys(expected).forEach((key) => {
        t.ok(Object.prototype.hasOwnProperty.call(arr, key));
        t.deepEqual(arr[key], expected[key]);
      });
      t.end();
    });
  });

  test(`${testName}: Function manipulation`, (t) => {
    const funcTestCases = [
      [function () {}, 'prototype'],
      [() => {}, 'prototype'],
      [{ fn: function () {} }, 'fn.prototype'],
      [{ fn: () => {} }, 'fn.prototype'],
    ];
    funcTestCases.forEach(([obj, path]) => {
      t.throws(() => set(obj, path, 'foo'), /Illegal access of function prototype/);
    });
    t.end();
  });
});

/**
 * setWith specific tests
 */

setWithFunctions.forEach(([setWith, testName]) => {
  test(`${testName}: Return undefined`, (t) => {
    t.deepEqual(
      setWith({}, 'a.b', 'foo', () => {}),
      { a: { b: 'foo' } }
    );
    t.end();
  });

  test(`${testName}: Customizer arguments`, (t) => {
    t.plan(3);

    const expectedCustomizerArgs = [
      [{ b: 42 }, 'a', { a: { b: 42 } }],
      [42, 'b', { b: 42 }],
    ];

    t.deepEqual(
      setWith({ a: { b: 42 } }, 'a.b.c', 'foo', (...args) => {
        t.deepEqual(args, expectedCustomizerArgs.shift());
      }),
      { a: { b: { c: 'foo' } } }
    );

    t.end();
  });

  test(`${testName}: Return value`, (t) => {
    t.deepEqual(setWith({}, '[0][1]', 'a', Object), { 0: { 1: 'a' } });
    t.end();
  });
});
