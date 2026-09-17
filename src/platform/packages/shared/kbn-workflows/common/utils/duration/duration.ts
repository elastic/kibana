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
 * Compound duration with units in descending order (w, d, h, m, s, ms).
 * That order is the validation: `1h30m` matches, `1m1h` does not.
 * `(?=.)` rejects the empty string (every unit group is otherwise optional).
 */
export const DURATION_REGEX = /^(?=.)(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?(?:\d+ms)?$/;

/** True when `duration` matches {@link DURATION_REGEX}. */
export function isValidDuration(duration: unknown): duration is string {
  return typeof duration === 'string' && DURATION_REGEX.test(duration);
}

/** Converts a compound duration string to milliseconds. */
export function parseDuration(duration: string): number {
  if (!isValidDuration(duration)) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
    );
  }

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
