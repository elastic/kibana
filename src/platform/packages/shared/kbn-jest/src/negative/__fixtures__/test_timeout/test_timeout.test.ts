/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Canary: a test that never resolves within its timeout. The runner must report
// the timeout as a failure.
describe('negative canary: test timeout', () => {
  it('never resolves within the timeout', async () => {
    await new Promise(() => {});
  }, 50);
});
