/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const randomSessionId = () => `my-session-${Math.random()}`;

export const randomHash = () =>
  Array.from({ length: 64 }, () =>
    'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26))
  ).join('');

/**
 * Polls a callback until it returns the expected value or the timeout is reached.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  expected: T,
  opts: { timeout?: number; interval?: number } = {}
) {
  const { timeout = 15_000, interval = 2_000 } = opts;
  const start = Date.now();
  let lastValue: T;
  while (Date.now() - start < timeout) {
    lastValue = await fn();
    if (lastValue === expected) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms. Last value: ${String(lastValue!)}`);
}
