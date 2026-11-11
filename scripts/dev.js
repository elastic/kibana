/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');
// `ink` is ESM-only with top-level await. This file is not transpiled by Babel, so import() stays a
// native dynamic import here, unlike in the TypeScript sources.
require('@kbn/dev-procs').runDevCli({
  loadInk: function loadInk() {
    return import('ink');
  },
});
