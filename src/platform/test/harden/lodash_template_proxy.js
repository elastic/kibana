/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');

// eslint-disable-next-line no-restricted-modules
const template = require('lodash/template');
// eslint-disable-next-line no-restricted-modules
const fpTemplate = require('lodash/fp/template');
const test = require('node:test');

// These tests verify that harden (src/setup_node_env/harden/index.js) actually replaces the
// module-cache entries for `lodash/template` and `lodash/fp/template` with the hardened proxies.
//
// lodash (>= 4.17.20 for `lodash/template`) already sanitizes `sourceURL` itself, so the security
// assertions in lodash_template.js pass whether or not the harden proxy is installed. These tests
// instead detect a behavioral fingerprint unique to the harden proxies, so that a regression in
// the cache replacement (the proxy silently not being installed) fails CI rather than passing
// because lodash happens to be safe on its own.

function stackOfThrowingTemplate(compiled) {
  try {
    compiled();
  } catch (err) {
    return err.stack;
  }
  throw new Error('expected compiled template to throw');
}

test('require("lodash/template") returns the hardened proxy', (t) => {
  // `createProxy` always forwards a `sourceURL` option, coercing it to a string. Called with an
  // empty options object it sets sourceURL to the string "undefined", which V8 uses as the script
  // name of the compiled template. The raw lodash module leaves sourceURL unset (it relies on
  // hasOwnProperty), so its compiled template has no such script name.
  const stack = stackOfThrowingTemplate(template('<% throw new Error() %>', {}));
  t.assert.match(
    stack,
    /\bundefined:\d+:\d+/,
    'compiled template should report the proxy-injected sourceURL "undefined"'
  );
});

test('require("lodash/fp/template") returns the hardened proxy', (t) => {
  // `createFpProxy` delegates to the patched non-fp `_.template` from the main lodash module, so a
  // compiled fp template originates from `lodash/lodash.js`. The raw fp/template module compiles
  // via the standalone `lodash/template.js` instead.
  const stack = stackOfThrowingTemplate(fpTemplate('<% throw new Error() %>'));
  t.assert.ok(
    stack.split('\n')[1].includes('lodash/lodash.js'),
    'compiled fp template should originate from the patched main lodash module'
  );
});
