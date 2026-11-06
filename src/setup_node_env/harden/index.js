/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var lodashPatch = require('./lodash_template');
var patchChildProcess = require('./child_process');
var hardenPrototypes = require('./prototype');

// We harden a fixed set of modules (`child_process` and lodash's `template`) against
// prototype-pollution style attacks. Previously this was done by intercepting `require`
// via `require-in-the-middle`. Instead, because this file runs before any application code, we eagerly
// load each target module and mutate its exports in place / replace its cache entry. Any
// later `require()` of these modules resolves to the hardened version, which matches the
// semantics of the previous approach (which also only affected loads after installation).

// `child_process` is a builtin, so its exports object is a shared singleton. Mutating its
// methods in place (as `patchChildProcess` does) hardens every later requirer, including
// `require('node:child_process')`.
patchChildProcess(require('child_process'));

// `lodash` and `lodash/fp` export objects, so we can reassign their `template` property in
// place on the cached exports object.
var lodashModule = require('lodash');
lodashModule.template = lodashPatch.createProxy(lodashModule.template);

var lodashFpModule = require('lodash/fp');
lodashFpModule.template = lodashPatch.createFpProxy(lodashFpModule.template);

// `lodash/template` and `lodash/fp/template` export the template function directly, so we
// cannot mutate them in place. Instead we replace the cached exports entry with the proxy so
// future `require()` calls receive the hardened function.
replaceCachedExports('lodash/template', lodashPatch.createProxy(require('lodash/template')));
replaceCachedExports(
  'lodash/fp/template',
  lodashPatch.createFpProxy(require('lodash/fp/template'))
);

function replaceCachedExports(request, patchedExports) {
  var resolved = require.resolve(request);
  var cached = require.cache[resolved];
  if (cached) {
    cached.exports = patchedExports;
  }
}

// Use of the `KBN_UNSAFE_DISABLE_PROTOTYPE_HARDENING` environment variable is discouraged, and should only be set to facilitate testing
// specific scenarios. This should never be set in production.
if (!process.env.KBN_UNSAFE_DISABLE_PROTOTYPE_HARDENING) {
  hardenPrototypes();
}
