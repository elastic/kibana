/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DURATION_UNITS_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
} as const;

const VALID_DURATION_REGEX = /^(?:(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms)?)$/;
const DURATION_COMPONENTS_REGEX = /(\d+)(ms|s|m|h|d|w)(?![a-zA-Z])/g;

/**
 * Parses a human-readable duration string into milliseconds.
 * Supports compound values like "1w2d3h4m5s6ms" with units in descending order.
 */
export const parseDuration = (duration: string): number => {
  if (!duration || typeof duration !== 'string' || !VALID_DURATION_REGEX.test(duration)) {
    throw new Error(
      `Invalid duration format: ${duration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
    );
  }

  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = DURATION_COMPONENTS_REGEX.exec(duration)) !== null) {
    const value = Number(match[1]);
    const unit = match[2] as keyof typeof DURATION_UNITS_MS;
    total += value * DURATION_UNITS_MS[unit];
  }

  return total;
};

export const isDurationValue = (value: string): boolean => /^(?:\d+(?:ms|s|m|h|d|w))+$/.test(value);
