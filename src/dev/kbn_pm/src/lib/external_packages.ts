/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// When this CJS file is loaded via the ESM loader (imported from .mjs), the
// `require()` provided is the ESM translator's synthetic require, which does
// NOT go through `require.extensions`.  That means the esbuild CJS hook
// registered by ts_require_hook.js never fires, and Node fails to load .ts
// files that contain ESM syntax.  Using `createRequire` gives us a real CJS
// `require` that honours `require.extensions`, so esbuild can transform .ts
// files to CJS on the fly.
const { createRequire: _createRequire } = require('node:module');
const _require = _createRequire(__filename);

module.exports = {
  ['@kbn/repo-packages'](): any {
    // we need to load this package before we install node modules so we can't use @kbn/* imports here
    // eslint-disable-next-line import/no-dynamic-require
    return _require('../../../../../' + 'src/platform/packages/private/kbn-repo-packages');
  },

  // NOTE: babel-register removed - these packages must be pre-built ESM
  ['@kbn/ci-stats-reporter'](): any {
    return _require('@kbn/ci-stats-reporter');
  },

  ['@kbn/yarn-lock-validator'](): any {
    return _require('@kbn/yarn-lock-validator');
  },

  ['@kbn/sort-package-json'](): any {
    return _require('@kbn/sort-package-json');
  },

  ['@kbn/get-repo-files'](): any {
    return _require('@kbn/get-repo-files');
  },
};
