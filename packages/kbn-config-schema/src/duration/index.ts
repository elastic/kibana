/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration, duration as momentDuration, DurationInputArg2, isDuration } from 'moment';
export type { Duration };
export { isDuration };

const timeFormatRegex = /^(0|[1-9][0-9]*)(ms|s|m|h|d|w|M|Y)$/;

function stringToDuration(text: string) {
  const result = timeFormatRegex.exec(text);
  if (!result) {
    const number = Number(text);
    if (typeof number !== 'number' || isNaN(number)) {
      throw new Error(
        `Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format ` +
          `<count>[ms|s|m|h|d|w|M|Y] (e.g. '70ms', '5s', '3d', '1Y'), where the duration is a safe positive integer.`
      );
    }
    return numberToDuration(number);
  }

  const count = parseInt(result[1], 10);
  const unit = result[2] as DurationInputArg2;

  return momentDuration(count, unit);
}

function numberToDuration(numberMs: number) {
  if (!Number.isSafeInteger(numberMs) || numberMs < 0) {
    throw new Error(`Value in milliseconds is expected to be a safe positive integer.`);
  }

  return momentDuration(numberMs);
}

export function ensureDuration(value: Duration | string | number) {
  if (typeof value === 'string') {
    return stringToDuration(value);
  }

  if (typeof value === 'number') {
    return numberToDuration(value);
  }

  return value;
}
