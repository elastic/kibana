/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type ivm from 'isolated-vm';

// User scripts run as synchronous code only. Async constructs are intentionally
// unsupported: top-level `await` throws a SyntaxError, and returning a Promise
// fails the structured-clone copy-out. Keeping execution synchronous means the
// in-isolate CPU `timeout` fully bounds every script (no suspended-promise hangs).
const USER_SCRIPT_RUNNER = `
  return new Function($0)();
`;

export const runUserScript = (
  ivmContext: ivm.Context,
  script: string,
  executionTimeoutMs: number
): Promise<unknown> =>
  ivmContext.evalClosure(USER_SCRIPT_RUNNER, [script], {
    arguments: { copy: true },
    result: { copy: true },
    timeout: executionTimeoutMs,
  });
