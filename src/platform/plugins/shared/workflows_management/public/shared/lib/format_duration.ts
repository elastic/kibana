/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Formats a duration in milliseconds to a human readable string.
 * @param duration - The duration in milliseconds.
 * @returns The formatted duration. e.g. "1m 30s", "1h 30m", "1d 3h", "1w 3d", etc.
 */
export function formatDuration(durationMs: number): string {
  let weeks = 0;
  let days = 0;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let milliseconds = durationMs;

  if (milliseconds >= 604800000) {
    weeks = Math.floor(milliseconds / 604800000);
    milliseconds %= 604800000;
  }

  if (milliseconds >= 86400000) {
    days = Math.floor(milliseconds / 86400000);
    milliseconds %= 86400000;
  }

  if (milliseconds >= 3600000) {
    hours = Math.floor(milliseconds / 3600000);
    milliseconds %= 3600000;
  }

  if (milliseconds >= 60000) {
    minutes = Math.floor(milliseconds / 60000);
    milliseconds %= 60000;
  }

  if (milliseconds >= 1000) {
    seconds = Math.floor(milliseconds / 1000);
    milliseconds %= 1000;
  }

  let result = '';
  if (weeks > 0) {
    result += `${weeks}w `;
  }
  if (days > 0) {
    result += `${days}d `;
  }
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0) {
    result += `${minutes}m `;
  }
  if (seconds > 0) {
    result += `${seconds}s `;
  }
  // hide milliseconds if there are any other units
  if (!result && milliseconds > 0) {
    result += `${milliseconds}ms`;
  }
  return result;
}
