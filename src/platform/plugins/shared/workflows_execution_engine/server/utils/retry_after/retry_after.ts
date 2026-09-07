/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const RETRY_AFTER_HEADER = 'retry-after';
const X_RATELIMIT_RESET_HEADER = 'x-ratelimit-reset';

/**
 * Reads server rate-limit hints from response headers and returns the delay in
 * milliseconds. Only delta-seconds forms are supported:
 *   - `Retry-After: 47`  => 47000 ms
 *   - `X-RateLimit-Reset: 1700000000` is interpreted as Unix epoch seconds if it
 *     parses as a timestamp far in the future; otherwise as delta-seconds.
 *
 * We follow the simpler connector convention used elsewhere in Kibana: parse the
 * value with `parseInt(..., 10)` and reject NaN. HTTP-date form of `Retry-After`
 * is intentionally out of scope because mis-parsing an absolute date as a small
 * delta would cause immediate premature retries.
 */
export function getRetryAfterMsFromHeaders(headers: Record<string, string>): number | undefined {
  const retryAfter = parseDeltaSeconds(headers[RETRY_AFTER_HEADER]);
  if (retryAfter != null) {
    return retryAfter;
  }

  const rawReset = headers[X_RATELIMIT_RESET_HEADER];
  if (rawReset == null) {
    return undefined;
  }

  const resetSeconds = parseInt(rawReset, 10);
  if (Number.isNaN(resetSeconds)) {
    return undefined;
  }

  // `X-RateLimit-Reset` is commonly a Unix timestamp, but some APIs emit a
  // delta-seconds value. Use a simple heuristic: anything large enough to be an
  // epoch (greater than 1_000_000_000 seconds, i.e. after Sep 2001) is treated
  // as absolute; otherwise treat it as delta-seconds. No real API sends a delta
  // of a billion seconds, and no valid epoch is smaller than that.
  const EPOCH_THRESHOLD_SECONDS = 1_000_000_000;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const delaySeconds =
    resetSeconds > EPOCH_THRESHOLD_SECONDS ? resetSeconds - nowSeconds : resetSeconds;

  return Math.max(0, delaySeconds * 1000);
}

function parseDeltaSeconds(value: string | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }

  const seconds = parseInt(value, 10);
  if (Number.isNaN(seconds)) {
    return undefined;
  }

  return Math.max(0, seconds * 1000);
}
