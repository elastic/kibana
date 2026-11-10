/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Canary: emit more output than a single V8 string can hold (~512MB). A runner that
// accumulates child output into a JS string (`buffer += ...`) overflows with
// "RangeError: Invalid string length" and must surface that as a failure rather than
// a pass. Writes are backpressure-aware so the bytes actually reach the runner.
// Tracks elastic/kibana-operations#624; remove this canary once the buffer is fixed.
describe('negative canary: log buffer overload', () => {
  it('emits more than a JS string can hold', async () => {
    const oneMb = 'x'.repeat(1024 * 1024);
    const targetMb = Number(process.env.NEGATIVE_LOG_MB ?? 600);

    for (let i = 0; i < targetMb; i++) {
      if (!process.stdout.write(oneMb)) {
        await new Promise((resolve) => process.stdout.once('drain', resolve));
      }
    }
  });
});
