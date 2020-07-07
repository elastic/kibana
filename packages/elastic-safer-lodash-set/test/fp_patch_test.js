/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

const assert = require('assert');

const setFunctions = [
  [testSet, require('../fp').set],
  [testSet, require('../fp/set')],
  [testSet, require('../fp').assoc],
  [testSet, require('../fp/assoc')],
  [testSet, require('../fp').assocPath],
  [testSet, require('../fp/assocPath')],
  [testSetWithAsSet, require('../fp').setWith],
  [testSetWithAsSet, require('../fp/setWith')],
];
const setWithFunctions = [require('../fp').setWith, require('../fp/setWith')];

function testSet(fn, args, onCall) {
  const [a, b, c] = args;
  onCall(fn(b, c, a));
  onCall(fn(b, c)(a));
  onCall(fn(b)(c, a));
  onCall(fn(b)(c)(a));
}

// use `fp.setWith` with the same API as `fp.set` by injecting a noop function as the first argument
function testSetWithAsSet(fn, args, onCall) {
  args.push(() => {});
  testSetWith(fn, args, onCall);
}

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

setFunctions.forEach(([test, set]) => {
  /**
   * GENERAL USAGE TESTS
   */

  const isSetWith = test.name === 'testSetWithAsSet';

  // No side-effects
  {
    const o1 = {};
    test(set, [o1, 'foo', 'bar'], (o2) => {
      assert.notStrictEqual(o1, o2);
      assert.deepStrictEqual(o1, {});
      assert.deepStrictEqual(o2, { foo: 'bar' });
    });
  }

  // Non-objects
  {
    const nonObjects = [null, undefined, NaN, 42];
    nonObjects.forEach((nonObject) => {
      test(set, [nonObject, 'a.b', 'foo'], (result) => {
        assert.strictEqual(result, nonObject);
      });
    });
  }

  // Overwrites existing object properties
  test(set, [{ a: { b: { c: 3 } } }, 'a.b', 'foo'], (result) => {
    assert.deepStrictEqual(result, { a: { b: 'foo' } });
  });

  // Adds missing properties without touching other areas
  test(
    set,
    [{ a: [{ aa: { aaa: 3, aab: 4 } }, { ab: 2 }], b: 1 }, 'a[0].aa.aaa.aaaa', 'foo'],
    (result) => {
      assert.deepStrictEqual(result, {
        a: [{ aa: { aaa: { aaaa: 'foo' }, aab: 4 } }, { ab: 2 }],
        b: 1,
      });
    }
  );

  // Overwrites existing elements in array
  test(set, [{ a: [1, 2, 3] }, 'a[1]', 'foo'], (result) => {
    assert.deepStrictEqual(result, { a: [1, 'foo', 3] });
  });

  // Create new array
  test(set, [{}, ['x', '0', 'y', 'z'], 'foo'], (result) => {
    assert.deepStrictEqual(result, { x: [{ y: { z: 'foo' } }] });
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

  // Object manipulation
  testCases.forEach(([path, expected]) => {
    test(set, [{}, path, 'foo'], (result) => {
      assert.deepStrictEqual(result, expected);
    });
  });

  // Array manipulation
  testCases.forEach(([path, expected]) => {
    const arr = [];
    test(set, [arr, path, 'foo'], (result) => {
      assert.notStrictEqual(arr, result);
      assert(Array.isArray(result));
      Object.keys(expected).forEach((key) => {
        assert(Object.prototype.hasOwnProperty.call(result, key));
        assert.deepStrictEqual(result[key], expected[key]);
      });
    });
  });

  // Function manipulation
  {
    const funcTestCases = [
      [{ fn: function () {} }, 'fn.prototype'],
      [{ fn: () => {} }, 'fn.prototype'],
    ];
    const msg = {
      message: 'Illegal access of function prototype',
    };
    funcTestCases.forEach(([obj, path]) => {
      if (isSetWith) {
        assert.throws(() => set(() => {}, path, 'foo', obj), msg);
        assert.throws(() => set(() => {})(path, 'foo', obj), msg);
        assert.throws(() => set(() => {})(path)('foo', obj), msg);
        assert.throws(() => set(() => {})(path)('foo')(obj), msg);
        assert.throws(() => set(() => {}, path)('foo')(obj), msg);
        assert.throws(() => set(() => {}, path, 'foo')(obj), msg);
        assert.throws(() => set(() => {})(path, 'foo')(obj), msg);
      } else {
        assert.throws(() => set(path, 'foo', obj), msg);
        assert.throws(() => set(path, 'foo')(obj), msg);
        assert.throws(() => set(path)('foo', obj), msg);
        assert.throws(() => set(path)('foo')(obj), msg);
      }
    });
  }
  {
    // This doesn't really make sence to do with the `fp` variant of lodash, as it will return a regular non-function object
    const obj = () => {};
    test(set, [obj, 'prototype', 'foo'], (result) => {
      assert.notStrictEqual(result, obj);
      assert.strictEqual(result.prototype, 'foo');
    });
  }
  {
    // This doesn't really make sence to do with the `fp` variant of lodash, as it will return a regular non-function object
    const obj = function () {};
    test(set, [obj, 'prototype', 'foo'], (result) => {
      assert.notStrictEqual(result, obj);
      assert.strictEqual(result.prototype, 'foo');
    });
  }
});

/**
 * setWith specific tests
 */
setWithFunctions.forEach((setWith) => {
  // Return undefined
  testSetWith(setWith, [{}, 'a.b', 'foo', () => {}], (result) => {
    assert.deepStrictEqual(result, { a: { b: 'foo' } });
  });

  // Customizer arguments
  {
    let i = 0;
    const expectedCustomizerArgs = [
      [{ b: 42 }, 'a', { a: { b: 42 } }],
      [42, 'b', { b: 42 }],
    ];

    testSetWith(
      setWith,
      [
        { a: { b: 42 } },
        'a.b.c',
        'foo',
        (...args) => {
          assert.deepStrictEqual(args, expectedCustomizerArgs[i++ % 2]);
        },
      ],
      (result) => {
        assert.deepStrictEqual(result, { a: { b: { c: 'foo' } } });
      }
    );
  }

  // Return value
  testSetWith(setWith, [{}, '[0][1]', 'a', Object], (result) => {
    assert.deepStrictEqual(result, { 0: { 1: 'a' } });
  });
});
