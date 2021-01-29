/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shouldRedirectFromOldBasePath } from './should_redirect_from_old_base_path';
it.each([
  ['app/foo'],
  ['app/bar'],
  ['login'],
  ['logout'],
  ['status'],
  ['s/1/status'],
  ['s/2/app/foo'],
])('allows %s', (path) => {
  if (!shouldRedirectFromOldBasePath(path)) {
    throw new Error(`expected [${path}] to be redirected from old base path`);
  }
});

it.each([['api/foo'], ['v1/api/bar'], ['bundles/foo/foo.bundle.js']])('blocks %s', (path) => {
  if (shouldRedirectFromOldBasePath(path)) {
    throw new Error(`expected [${path}] to NOT be redirected from old base path`);
  }
});
