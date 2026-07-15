/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Runner } from '../../fake_mocha_types';

/**
 * Exit code used when an FTR run is aborted early because too many tests failed
 * back-to-back. Chosen to avoid Node's reserved exit codes (1-13), signal exit
 * codes (128+), and the runner's normal 0/1 statuses so CI can match on it.
 */
export const FTR_FAIL_FAST_EXIT_CODE = 91;

const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Thrown to unwind the FTR run once fail-fast trips. `runFtr` maps it to a
 * `createFailError` carrying {@link FTR_FAIL_FAST_EXIT_CODE}.
 */
export class FailFastAbortError extends Error {
  constructor(public readonly consecutiveFailures: number, public readonly limit: number) {
    super(
      `Aborting FTR run after ${consecutiveFailures} consecutive test failures ` +
        `(fail-fast limit is ${limit}). This usually indicates an environmental ` +
        `problem rather than individual test bugs.`
    );
    this.name = 'FailFastAbortError';
  }
}

export function isFailFastAbortError(error: unknown): error is FailFastAbortError {
  return error instanceof FailFastAbortError;
}

/**
 * Reads the fail-fast configuration from the environment. Returns `undefined`
 * (disabled) unless `FTR_FAIL_FAST_ENABLED` is `1` or `true`. When enabled,
 * `FTR_FAIL_FAST_MAX_CONSECUTIVE_FAILURES` overrides the default limit; invalid
 * values fall back to the default.
 */
export function getFailFastLimitFromEnv(env: NodeJS.ProcessEnv = process.env): number | undefined {
  if (!/^(1|true)$/.test(env.FTR_FAIL_FAST_ENABLED ?? '')) {
    return undefined;
  }

  const raw = env.FTR_FAIL_FAST_MAX_CONSECUTIVE_FAILURES;
  const parsed = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_CONSECUTIVE_FAILURES;
}

/**
 * Watches a mocha runner and invokes `onTrip` once `limit` failures occur
 * back-to-back (any passing test resets the streak). Hook failures count toward
 * the streak since environmental breakage often surfaces there. `onTrip` is
 * invoked at most once.
 */
export function setupFailFast(
  runner: Runner,
  log: ToolingLog,
  { limit, onTrip }: { limit: number; onTrip: (consecutiveFailures: number) => void }
): void {
  let consecutiveFailures = 0;
  let tripped = false;

  runner.on('pass', () => {
    consecutiveFailures = 0;
  });

  runner.on('fail', () => {
    if (tripped) {
      return;
    }

    consecutiveFailures += 1;
    if (consecutiveFailures >= limit) {
      tripped = true;
      log.error(
        `fail-fast: reached ${consecutiveFailures} consecutive test failures (limit ${limit}), aborting run`
      );
      onTrip(consecutiveFailures);
    }
  });
}
