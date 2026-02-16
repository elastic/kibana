/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'node:module';

// createRequire gives us a real CJS require that honours require.extensions,
// so the esbuild CJS hook registered by ts_require_hook.js can transform .ts
// files on the fly.
const _require = createRequire(import.meta.url);

export default {
  ['@kbn/repo-packages'](): any {
    // we need to load this package before we install node modules so we can't use @kbn/* imports here
    // eslint-disable-next-line import/no-dynamic-require
    return _require('../../../../../' + 'src/platform/packages/private/kbn-repo-packages');
  },

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
