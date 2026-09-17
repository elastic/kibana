/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DURATION_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Upper bound on a duration string. Compound forms like `1w2d3h4m5s6ms` are
 * well under this; the cap is applied before either duration regex, including
 * on values rendered from HITL timeout templates.
 */
export const MAX_DURATION_LENGTH = 64;

/**
 * Compound duration with units in descending order (w, d, h, m, s, ms).
 * That order is the validation: `1h30m` matches, `1m1h` does not.
 * `(?=.)` rejects the empty string (every unit group is otherwise optional).
 */
export const DURATION_REGEX = /^(?=.)(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?(?:\d+ms)?$/;

/** True when `duration` is a compound duration no longer than {@link MAX_DURATION_LENGTH}. */
export function isValidDuration(duration: unknown): duration is string {
  return (
    typeof duration === 'string' &&
    duration.length <= MAX_DURATION_LENGTH &&
    DURATION_REGEX.test(duration)
  );
}

/** Throws if `duration` is not a compound duration string. */
export function assertValidDuration(duration: unknown): asserts duration is string {
  if (!isValidDuration(duration)) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
    );
  }
}

/** Converts a compound duration string to milliseconds. */
export function parseDuration(duration: string): number {
  assertValidDuration(duration);

  let total = 0;
  const durationComponentsRegex = /(\d+)(ms|s|m|h|d|w)(?![a-zA-Z])/g;
  let match;
  while ((match = durationComponentsRegex.exec(duration)) !== null) {
    const value = Number(match[1]);
    const unit = match[2] as keyof typeof DURATION_MS;
    total += value * DURATION_MS[unit];
  }
  return total;
}
