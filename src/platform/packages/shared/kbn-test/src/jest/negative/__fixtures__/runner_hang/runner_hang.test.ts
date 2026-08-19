/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Canary: the test passes but leaves an open handle (a referenced interval), so the
// Jest child process (run without --forceExit) never exits. A runner with no
// per-config timeout waits on the child's 'exit' event forever and hangs.
// Tracks elastic/kibana-operations#626; update this canary once the runner enforces
// a per-config timeout.
describe('negative canary: runner hang', () => {
  it('passes but leaves the event loop alive', () => {
    setInterval(() => {}, 60_000);
    expect('runner_hang').toBeTruthy();
  });
});
