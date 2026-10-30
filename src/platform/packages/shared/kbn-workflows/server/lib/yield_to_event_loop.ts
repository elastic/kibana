/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const BUDGET_MS = 25;

// Shared by every caller in the process: concurrent runs must pause together, otherwise
// each one resumes with a fresh budget and the blocks add up to N × BUDGET_MS.
let lastYieldAt = performance.now();
let pendingYield: Promise<void> | undefined;

/**
 * Yields to the event loop (setImmediate) once 25 ms have passed since the last yield.
 */
export const yieldToEventLoop = (): Promise<void> => {
  if (performance.now() - lastYieldAt < BUDGET_MS) {
    return Promise.resolve();
  }
  pendingYield ??= new Promise<void>((resolve) =>
    setImmediate(() => {
      lastYieldAt = performance.now();
      pendingYield = undefined;
      resolve();
    })
  );
  return pendingYield;
};
