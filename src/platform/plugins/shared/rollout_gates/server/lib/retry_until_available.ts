/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';

/** Thrown out of {@link retryUntilAvailable} once `isStopped()` starts returning `true`. */
export class RolloutGatesStoppedError extends Error {}

export interface RetryUntilAvailableOptions {
  logger: Logger;
  /** Included in log messages and in the error thrown on shutdown. */
  label: string;
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Checked before every attempt, including the first. Defaults to never stopping. */
  isStopped?: () => boolean;
  /** Overridable so tests do not wait on real timers. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries `fn` with exponential backoff until it resolves, logging each failure as a warning.
 * Intended for work that depends on Elasticsearch being reachable at Kibana startup, which is
 * not guaranteed on the first attempt.
 *
 * Stops retrying once `isStopped()` returns `true` (checked before every attempt), throwing
 * {@link RolloutGatesStoppedError} instead of resolving, so plugin shutdown does not leave a
 * dangling retry loop running in the background.
 */
export async function retryUntilAvailable<T>(
  fn: () => Promise<T>,
  {
    logger,
    label,
    initialDelayMs = 1000,
    maxDelayMs = 30_000,
    isStopped = () => false,
    sleep = defaultSleep,
  }: RetryUntilAvailableOptions
): Promise<T> {
  let delayMs = initialDelayMs;

  for (;;) {
    if (isStopped()) {
      throw new RolloutGatesStoppedError(`${label}: aborted because the plugin is stopping`);
    }

    try {
      return await fn();
    } catch (error) {
      logger.warn(`${label} failed, retrying in ${delayMs}ms: ${(error as Error).message}`);
      await sleep(delayMs);
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }
}
