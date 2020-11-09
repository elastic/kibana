/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

const test = require('tape');

const setFunctions = [
  [testSet, require('../fp').set, 'fp.set'],
  [testSet, require('../fp/set'), 'fp/set'],
  [testSet, require('../fp').assoc, 'fp.assoc'],
  [testSet, require('../fp/assoc'), 'fp/assoc'],
  [testSet, require('../fp').assocPath, 'fp.assocPath'],
  [testSet, require('../fp/assocPath'), 'fp/assocPath'],
  [testSetWithAsSet, require('../fp').setWith, 'fp.setWith'],
  [testSetWithAsSet, require('../fp/setWith'), 'fp/setWith'],
];
const setWithFunctions = [
  [testSetWith, require('../fp').setWith, 'fp.setWith'],
  [testSetWith, require('../fp/setWith'), 'fp/setWith'],
];

function testSet(fn, args, onCall) {
  const [a, b, c] = args;
  onCall(fn(b, c, a));
  onCall(fn(b, c)(a));
  onCall(fn(b)(c, a));
  onCall(fn(b)(c)(a));
}
testSet.assertionCalls = 4;

function testSetWith(fn, args, onCall) {
  const [a, b, c, d] = args;
  onCall(fn(d, b, c, a));
  onCall(fn(d)(b, c, a));
  onCall(fn(d)(b)(c, a));
  onCall(fn(d)(b)(c)(a));
  onCall(fn(d, b)(c)(a));
  onCall(fn(d, b, c)(a));
  onCall(fn(d)(b, c)(a));
}
testSetWith.assertionCalls = 7;

// use `fp.setWith` with the same API as `fp.set` by injecting a noop function as the first argument
function testSetWithAsSet(fn, args, onCall) {
  args.push(() => {});
  testSetWith(fn, args, onCall);
}
testSetWithAsSet.assertionCalls = testSetWith.assertionCalls;

setFunctions.forEach(([testPermutations, set, testName]) => {
  /**
   * GENERAL USAGE TESTS
   */

  const isSetWith = testPermutations.name === 'testSetWithAsSet';

  test(`${testName}: No side-effects`, (t) => {
    t.plan(testPermutations.assertionCalls * 5);
    const o1 = {
      a: { b: 1 },
      c: { d: 2 },
    };
    testPermutations(set, [o1, 'a.b', 3], (o2) => {
      t.notStrictEqual(o1, o2); // clone touched paths
      t.notStrictEqual(o1.a, o2.a); // clone touched paths
      t.deepEqual(o1.c, o2.c); // do not clone untouched paths
      t.deepEqual(o1, { a: { b: 1 }, c: { d: 2 } });
      t.deepEqual(o2, { a: { b: 3 }, c: { d: 2 } });
    });
  });

  test(`${testName}: Non-objects`, (t) => {
    const nonObjects = [null, undefined, NaN, 42];
    t.plan(testPermutations.assertionCalls * nonObjects.length * 3);
    nonObjects.forEach((nonObject) => {
      t.comment(String(nonObject));
      testPermutations(set, [nonObject, 'a.b', 'foo'], (result) => {
        if (Number.isNaN(nonObject)) {
          t.ok(result instanceof Number);
          t.strictEqual(result.toString(), 'NaN');
          t.deepEqual(result, Object.assign(NaN, { a: { b: 'foo' } })); // will produce new object due to cloning
        } else if (nonObject === 42) {
          t.ok(result instanceof Number);
          t.strictEqual(result.toString(), '42');
          t.deepEqual(result, Object.assign(42, { a: { b: 'foo' } })); // will produce new object due to cloning
        } else {
          t.ok(result instanceof Object);
          t.strictEqual(result.toString(), '[object Object]');
          t.deepEqual(result, { a: { b: 'foo' } }); // will produce new object due to cloning
        }
      });
    });
  });

  test(`${testName}: Overwrites existing object properties`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testPermutations(set, [{ a: { b: { c: 3 } } }, 'a.b', 'foo'], (result) => {
      t.deepEqual(result, { a: { b: 'foo' } });
    });
  });

  test(`${testName}: Adds missing properties without touching other areas`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testPermutations(
      set,
      [{ a: [{ aa: { aaa: 3, aab: 4 } }, { ab: 2 }], b: 1 }, 'a[0].aa.aaa.aaaa', 'foo'],
      (result) => {
        t.deepEqual(result, {
          a: [{ aa: { aaa: Object.assign(3, { aaaa: 'foo' }), aab: 4 } }, { ab: 2 }],
          b: 1,
        });
      }
    );
  });

  test(`${testName}: Overwrites existing elements in array`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testPermutations(set, [{ a: [1, 2, 3] }, 'a[1]', 'foo'], (result) => {
      t.deepEqual(result, { a: [1, 'foo', 3] });
    });
  });

  test(`${testName}: Create new array`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testPermutations(set, [{}, ['x', '0', 'y', 'z'], 'foo'], (result) => {
      t.deepEqual(result, { x: [{ y: { z: 'foo' } }] });
    });
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
      t.plan(testPermutations.assertionCalls);
      testPermutations(set, [{}, path, 'foo'], (result) => {
        t.deepLooseEqual(result, expected); // Use loose check because the prototype of result isn't Object.prototype
      });
    });
  });

  testCases.forEach(([path, expected]) => {
    test(`${testName}: Array manipulation, ${path}`, (t) => {
      t.plan(testPermutations.assertionCalls * 4);
      const arr = [];
      testPermutations(set, [arr, path, 'foo'], (result) => {
        t.notStrictEqual(arr, result);
        t.ok(Array.isArray(result));
        Object.keys(expected).forEach((key) => {
          t.ok(Object.prototype.hasOwnProperty.call(result, key));
          t.deepEqual(result[key], expected[key]);
        });
      });
    });
  });

  test(`${testName}: Function manipulation, object containing function`, (t) => {
    const funcTestCases = [
      [{ fn: function () {} }, 'fn.prototype'],
      [{ fn: () => {} }, 'fn.prototype'],
    ];
    const expected = /Illegal access of function prototype/;
    t.plan((isSetWith ? 7 : 4) * funcTestCases.length);
    funcTestCases.forEach(([obj, path]) => {
      if (isSetWith) {
        t.throws(() => set(() => {}, path, 'foo', obj), expected);
        t.throws(() => set(() => {})(path, 'foo', obj), expected);
        t.throws(() => set(() => {})(path)('foo', obj), expected);
        t.throws(() => set(() => {})(path)('foo')(obj), expected);
        t.throws(() => set(() => {}, path)('foo')(obj), expected);
        t.throws(() => set(() => {}, path, 'foo')(obj), expected);
        t.throws(() => set(() => {})(path, 'foo')(obj), expected);
      } else {
        t.throws(() => set(path, 'foo', obj), expected);
        t.throws(() => set(path, 'foo')(obj), expected);
        t.throws(() => set(path)('foo', obj), expected);
        t.throws(() => set(path)('foo')(obj), expected);
      }
    });
  });
  test(`${testName}: Function manipulation, arrow function`, (t) => {
    // This doesn't really make sense to do with the `fp` variant of lodash, as it will return a regular non-function object
    t.plan(testPermutations.assertionCalls * 2);
    const obj = () => {};
    testPermutations(set, [obj, 'prototype', 'foo'], (result) => {
      t.notStrictEqual(result, obj);
      t.strictEqual(result.prototype, 'foo');
    });
  });
  test(`${testName}: Function manipulation, regular function`, (t) => {
    // This doesn't really make sense to do with the `fp` variant of lodash, as it will return a regular non-function object
    t.plan(testPermutations.assertionCalls * 2);
    const obj = function () {};
    testPermutations(set, [obj, 'prototype', 'foo'], (result) => {
      t.notStrictEqual(result, obj);
      t.strictEqual(result.prototype, 'foo');
    });
  });
});

/**
 * setWith specific tests
 */
setWithFunctions.forEach(([testPermutations, setWith, testName]) => {
  test(`${testName}: Return undefined`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testPermutations(setWith, [{}, 'a.b', 'foo', () => {}], (result) => {
      t.deepEqual(result, { a: { b: 'foo' } });
    });
  });

  test(`${testName}: Customizer arguments`, (t) => {
    let i = 0;
    const expectedCustomizerArgs = [
      [{ b: Object(42) }, 'a', { a: { b: Object(42) } }],
      [Object(42), 'b', { b: Object(42) }],
    ];

    t.plan(testPermutations.assertionCalls * (expectedCustomizerArgs.length + 1));

    testPermutations(
      setWith,
      [
        { a: { b: 42 } },
        'a.b.c',
        'foo',
        (...args) => {
          t.deepEqual(
            args,
            expectedCustomizerArgs[i++ % 2],
            'customizer args should be as expected'
          );
        },
      ],
      (result) => {
        t.deepEqual(result, { a: { b: Object.assign(42, { c: 'foo' }) } });
      }
    );
  });

  test(`${testName}: Return value`, (t) => {
    t.plan(testPermutations.assertionCalls);
    testSetWith(setWith, [{}, '[0][1]', 'a', Object], (result) => {
      t.deepEqual(result, { 0: { 1: 'a' } });
    });
  });
});
