/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Canary: exhaust the V8 heap so the test process is OOM-killed. scripts/jest_negative
// runs this with a small --max-old-space-size so it crashes quickly and deterministically.
// The runner must surface the crash as a failure rather than a pass.
describe('negative canary: out of memory', () => {
  it('exhausts the heap', () => {
    const blocks: string[] = [];
    for (;;) {
      blocks.push('x'.repeat(10 * 1024 * 1024));
    }
  });
});
