/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Canary: a test calls process.exit(0) mid-run. With --runInBand tests execute in
// the Jest main process, so this terminates the child with exit code 0 before the
// failing test below ever runs and before Jest prints a summary. A runner that
// trusts the exit code alone will mark this config as PASSED.
// Tracks elastic/kibana-operations#625; update this canary once the runner detects
// incomplete Jest runs.
describe('negative canary: process exit zero', () => {
  it('exits the process with 0 before failures can run', () => {
    process.exit(0);
  });

  it('would fail, but never runs', () => {
    expect('process_exit_zero').toBe('caught');
  });
});
