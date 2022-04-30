/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

function parseInt(n: string) {
  const number = Number.parseInt(n, 10);
  if (Number.isNaN(number)) {
    throw new Error(`invalid number [${n}]`);
  }
  return number;
}

/**
 * Parse a timeout value to milliseconds. Supports undefined, a number, an
 * empty string, a string representing a number of minutes eg 1m, or a string
 * representing a number of seconds eg 60. All other values throw an error
 */
export function parseTimeoutToMs(seconds: any): number | undefined {
  if (seconds === undefined || seconds === '') {
    return undefined;
  }

  if (typeof seconds === 'number' && !Number.isNaN(seconds)) {
    return seconds;
  }

  if (typeof seconds !== 'string') {
    throw new Error(`[${inspect(seconds)}] is not a valid timeout value`);
  }

  if (seconds.endsWith('m')) {
    const m = parseInt(seconds.slice(0, -1));
    return m * 60 * 1000;
  }

  return parseInt(seconds) * 1000;
}
