/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function canRequire(cwd, entry) {
  try {
    // We will try to test if we can resolve
    // this entry through the require.resolve
    // setting as the start looking path the
    // given cwd. Require.resolve will keep
    // looking recursively as normal starting
    // from that location.
    return require.resolve(entry, {
      paths: [cwd],
    });
  } catch (e) {
    return false;
  }
}
