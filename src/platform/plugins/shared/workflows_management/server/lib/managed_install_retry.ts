/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Waits before each retry of a managed install that failed on a transient Elasticsearch error:
 * doubling from 1 s to 60 s, about 5 minutes in all.
 */
export const MANAGED_INSTALL_RETRY_DELAYS_MS = [
  1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000, 60_000,
] as const;

/**
 * Wait before retry number `retry` (0-based): between half and all of its delay, so the Kibana
 * nodes of a deployment that hit the same Elasticsearch blip do not retry in lockstep.
 */
export const getManagedInstallRetryDelayMs = (retry: number): number => {
  const delayMs =
    MANAGED_INSTALL_RETRY_DELAYS_MS[Math.min(retry, MANAGED_INSTALL_RETRY_DELAYS_MS.length - 1)];
  return Math.round(delayMs / 2 + (Math.random() * delayMs) / 2);
};

/** Resolves after `delayMs`, or as soon as `signal` aborts. */
export const waitUnlessAborted = (delayMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });
