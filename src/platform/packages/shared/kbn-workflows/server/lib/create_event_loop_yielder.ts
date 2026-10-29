/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DEFAULT_BUDGET_MS = 25;

/**
 * Returns a function that yields to the event loop (setImmediate) once `budgetMs` has passed since the last yield.
 */
export const createEventLoopYielder = (budgetMs = DEFAULT_BUDGET_MS): (() => Promise<void>) => {
  let lastYieldAt = performance.now();
  return () => {
    if (performance.now() - lastYieldAt < budgetMs) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) =>
      setImmediate(() => {
        lastYieldAt = performance.now();
        resolve();
      })
    );
  };
};
