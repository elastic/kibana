/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// We must disable prototype hardening to test the pollution
process.env.KBN_UNSAFE_DISABLE_PROTOTYPE_HARDENING = 'true';

require('@kbn/setup-node-env');
const _ = require('lodash');
// eslint-disable-next-line no-restricted-modules
const template = require('lodash/template');
const fp = require('lodash/fp');
// eslint-disable-next-line no-restricted-modules
const fpTemplate = require('lodash/fp/template');
const test = require('node:test');
const { after } = require('node:test');

Object.prototype.sourceURL = '\u2028\u2029\n;global.whoops=true'; // eslint-disable-line no-extend-native

after(() => {
  delete Object.prototype.sourceURL;
});

test('test setup ok', (t) => {
  t.assert.strictEqual({}.sourceURL, '\u2028\u2029\n;global.whoops=true');
});

// eslint-disable-next-line no-restricted-properties
[_.template, template].forEach((fn) => {
  test(`_.template('<%= foo %>')`, (t) => {
    const output = fn('<%= foo %>')({ foo: 'bar' });
    t.assert.strictEqual(output, 'bar');
    t.assert.strictEqual(global.whoops, undefined);
  });

  test(`_.template('<%= foo %>', {})`, (t) => {
    const output = fn('<%= foo %>', Object.freeze({}))({ foo: 'bar' });
    t.assert.strictEqual(output, 'bar');
    t.assert.strictEqual(global.whoops, undefined);
  });

  test(`_.template('<%= data.foo %>', { variable: 'data' })`, (t) => {
    const output = fn('<%= data.foo %>', Object.freeze({ variable: 'data' }))({ foo: 'bar' });
    t.assert.strictEqual(output, 'bar');
    t.assert.strictEqual(global.whoops, undefined);
  });

  test(`_.template('<%= foo %>', { sourceURL: '/foo/bar' })`, (t) => {
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    const template = fn('<% throw new Error() %>', Object.freeze({ sourceURL: '/foo/bar' }));
    t.plan(2);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.assert.strictEqual(path, '/foo/bar');
      t.assert.strictEqual(global.whoops, undefined);
    }
  });

  test(`_.template('<%= foo %>', { sourceURL: '\\u2028\\u2029\\nglobal.whoops=true' })`, (t) => {
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    const template = fn(
      '<% throw new Error() %>',
      Object.freeze({ sourceURL: '\u2028\u2029\nglobal.whoops=true' })
    );
    t.plan(2);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.assert.strictEqual(path, 'global.whoops=true');
      t.assert.strictEqual(global.whoops, undefined);
    }
  });

  test(`_.template used as an iteratee call(`, (t) => {
    const templateStrArr = ['<%= data.foo %>', 'example <%= data.foo %>'];
    const output = _.map(templateStrArr, fn);

    t.assert.strictEqual(output[0]({ data: { foo: 'bar' } }), 'bar');
    t.assert.strictEqual(output[1]({ data: { foo: 'bar' } }), 'example bar');
    t.assert.strictEqual(global.whoops, undefined);
  });
});

[fp.template, fpTemplate].forEach((fn) => {
  test(`fp.template('<%= foo %>')`, (t) => {
    const output = fn('<%= foo %>')({ foo: 'bar' });
    t.assert.strictEqual(output, 'bar');
    t.assert.strictEqual(global.whoops, undefined);
  });

  test(`fp.template('<%= foo %>', {})`, (t) => {
    // fp.template ignores the second argument, this is negligible in this situation since options is an empty object
    const output = fn('<%= foo %>', Object.freeze({}))({ foo: 'bar' });
    t.assert.strictEqual(output, 'bar');
    t.assert.strictEqual(global.whoops, undefined);
  });

  test(`fp.template('<%= data.foo %>', { variable: 'data' })`, (t) => {
    // fp.template ignores the second argument, this causes an error to be thrown
    t.plan(2);
    try {
      fn('<%= data.foo %>', Object.freeze({ variable: 'data' }))({ foo: 'bar' });
    } catch (err) {
      t.assert.strictEqual(err.message, 'data is not defined');
      t.assert.strictEqual(global.whoops, undefined);
    }
  });

  test(`fp.template('<%= foo %>', { sourceURL: '/foo/bar' })`, (t) => {
    // fp.template ignores the second argument, the sourceURL is ignored
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    // our patching to hard-code the sourceURL and use non-FP _.template does slightly alter the stack-traces but it's negligible
    const template = fn('<% throw new Error() %>', Object.freeze({ sourceURL: '/foo/bar' }));
    t.plan(3);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.assert.match(path, /^eval at <anonymous> /);
      t.assert.doesNotMatch(path, /\/foo\/bar/);
      t.assert.strictEqual(global.whoops, undefined);
    }
  });

  test(`fp.template('<%= foo %>', { sourceURL: '\\u2028\\u2029\\nglobal.whoops=true' })`, (t) => {
    // fp.template ignores the second argument, the sourceURL is ignored
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    // our patching to hard-code the sourceURL and use non-FP _.template does slightly alter the stack-traces but it's negligible
    const template = fn(
      '<% throw new Error() %>',
      Object.freeze({ sourceURL: '\u2028\u2029\nglobal.whoops=true' })
    );
    t.plan(3);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.assert.match(path, /^eval at <anonymous> /);
      t.assert.doesNotMatch(path, /\/foo\/bar/);
      t.assert.strictEqual(global.whoops, undefined);
    }
  });

  test(`fp.template used as an iteratee call(`, (t) => {
    const templateStrArr = ['<%= data.foo %>', 'example <%= data.foo %>'];
    const output = fp.map(fn)(templateStrArr);

    t.assert.strictEqual(output[0]({ data: { foo: 'bar' } }), 'bar');
    t.assert.strictEqual(output[1]({ data: { foo: 'bar' } }), 'example bar');
    t.assert.strictEqual(global.whoops, undefined);
  });
});

function parsePathFromStack(stack) {
  const lines = stack.split('\n');
  // the frame starts at the second line
  const frame = lines[1];

  // the path is in parathensis, and ends with a colon before the line/column numbers
  const [, path] = /\(([^:]+)/.exec(frame);
  return path;
}
