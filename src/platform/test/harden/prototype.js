/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

const test = require('node:test');

test('Object.prototype', async (t) => {
  await t.test('Prevents new properties from being added to the prototype', (t) => {
    Object.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.assert.strictEqual({}.test, undefined);
  });

  await t.test('Permits overriding Object.prototype.toString', async (t) => {
    let originalToString;
    await t.test('setup', () => {
      originalToString = Object.prototype.toString;
    });

    await t.test('test', (t) => {
      // Assert native toString behavior
      t.assert.strictEqual({}.toString(), '[object Object]');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(Object.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      Object.prototype.toString = function toString() {
        return 'my new toString function';
      };
      t.assert.strictEqual({}.toString(), 'my new toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.assert.strictEqual(toStringDescriptor.writable, originalWritable);
      t.assert.strictEqual(toStringDescriptor.enumerable, originalEnumerable);
      t.assert.strictEqual(toStringDescriptor.configurable, originalConfigurable);
    });

    await t.test('teardown', () => {
      // eslint-disable-next-line no-extend-native
      Object.prototype.toString = originalToString;
    });
  });
});

test('Number.prototype', async (t) => {
  await t.test('Prevents new properties from being added to the prototype', (t) => {
    Number.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.assert.strictEqual((12).test, undefined);
  });

  await t.test('Permits overriding Number.prototype.toString', async (t) => {
    let originalToString;
    await t.test('setup', () => {
      originalToString = Number.prototype.toString;
    });

    await t.test('test', (t) => {
      // Assert native toString behavior
      t.assert.strictEqual((1).toString(), '1');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(Number.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      Number.prototype.toString = function toString() {
        return 'my new Number.toString function';
      };
      t.assert.strictEqual((12).toString(), 'my new Number.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(Number.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.assert.strictEqual(toStringDescriptor.writable, originalWritable);
      t.assert.strictEqual(toStringDescriptor.enumerable, originalEnumerable);
      t.assert.strictEqual(toStringDescriptor.configurable, originalConfigurable);
    });

    await t.test('teardown', () => {
      // eslint-disable-next-line no-extend-native
      Number.prototype.toString = originalToString;
    });
  });
});

test('String.prototype', async (t) => {
  await t.test('Prevents new properties from being added to the prototype', (t) => {
    String.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.assert.strictEqual('hello'.test, undefined);
  });

  await t.test('Permits overriding String.prototype.toString', async (t) => {
    let originalToString;
    await t.test('setup', () => {
      originalToString = String.prototype.toString;
    });

    await t.test('test', (t) => {
      // Assert native toString behavior
      t.assert.strictEqual((1).toString(), '1');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(String.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      String.prototype.toString = function toString() {
        return 'my new String.toString function';
      };
      t.assert.strictEqual('test'.toString(), 'my new String.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(String.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.assert.strictEqual(toStringDescriptor.writable, originalWritable);
      t.assert.strictEqual(toStringDescriptor.enumerable, originalEnumerable);
      t.assert.strictEqual(toStringDescriptor.configurable, originalConfigurable);
    });

    await t.test('teardown', () => {
      // eslint-disable-next-line no-extend-native
      String.prototype.toString = originalToString;
    });
  });
});

test('Function.prototype', async (t) => {
  await t.test('Prevents new properties from being added to the prototype', (t) => {
    Function.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    const fn = function testFn() {};
    t.assert.strictEqual(fn.test, undefined);
  });

  await t.test('Permits overriding Function.prototype.toString', async (t) => {
    let originalToString;
    await t.test('setup', () => {
      originalToString = Function.prototype.toString;
    });

    await t.test('test', (t) => {
      // Assert native toString behavior
      const fn = function testFn() {};
      t.assert.strictEqual(fn.toString(), 'function testFn() {}');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      Function.prototype.toString = function toString() {
        return 'my new Function.toString function';
      };
      t.assert.strictEqual(fn.toString(), 'my new Function.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.assert.strictEqual(toStringDescriptor.writable, originalWritable);
      t.assert.strictEqual(toStringDescriptor.enumerable, originalEnumerable);
      t.assert.strictEqual(toStringDescriptor.configurable, originalConfigurable);
    });

    await t.test('teardown', () => {
      // eslint-disable-next-line no-extend-native
      Function.prototype.toString = originalToString;
    });
  });
});
