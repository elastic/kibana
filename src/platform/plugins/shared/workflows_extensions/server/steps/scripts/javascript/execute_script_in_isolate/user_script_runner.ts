/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type ivm from 'isolated-vm';

const USER_SCRIPT_RUNNER = `
  const AsyncFunction = async function () {}.constructor;
  return new AsyncFunction($0)();
`;

export const runUserScript = (
  ivmContext: ivm.Context,
  script: string,
  executionTimeoutMs: number
): Promise<unknown> =>
  ivmContext.evalClosure(USER_SCRIPT_RUNNER, [script], {
    arguments: { copy: true },
    promise: true,
    result: { promise: true, copy: true },
    timeout: executionTimeoutMs,
  });
