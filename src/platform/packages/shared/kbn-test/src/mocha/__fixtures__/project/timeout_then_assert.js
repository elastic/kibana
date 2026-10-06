/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// A Mocha timeout followed by an independent assertion failure. Without `runner.abort()`, Mocha
// continues and that later failure is a real, reportable error.
describe('TIMEOUT_THEN_ASSERT', () => {
  before('timeout', async function () {
    this.timeout(1);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('never runs', () => {});

  after('independent failure', () => {
    throw new Error('INDEPENDENT_ASSERT');
  });
});
