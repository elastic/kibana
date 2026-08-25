/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function parseDuration(duration: string): number {
  const units = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  let total = 0;
  // Regular expression to validate the duration format and order (w, d, h, m, s, ms)
  const validDurationRegex = /^(?:(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms)?)$/;
  const orderValidationRegex = /^(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?(?:\d+ms)?$/;

  if (
    !duration ||
    typeof duration !== 'string' ||
    !validDurationRegex.test(duration) ||
    !orderValidationRegex.test(duration)
  ) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
    );
  }

  const durationComponentsRegex = /(\d+)(ms|s|m|h|d|w)(?![a-zA-Z])/g;
  let match;
  while ((match = durationComponentsRegex.exec(duration)) !== null) {
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = units[unit as keyof typeof units];
    total += value * multiplier;
  }
  return total;
}
