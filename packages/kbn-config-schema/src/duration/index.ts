/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration, duration as momentDuration, isDuration } from 'moment';
export type { Duration };
export { isDuration };

const timeFormatRegex = /^(0|[1-9][0-9]*)(ms|s|m|h|d|w|M|y|Y)(.*)$/;
type TimeUnitString = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y' | 'Y'; // Moment officially supports lowercased 'y', but keeping 'Y' for BWC

function stringToDuration(text: string): Duration {
  const result = timeFormatRegex.exec(text);
  if (!result) {
    const number = Number(text);
    if (typeof number !== 'number' || isNaN(number)) {
      throw new Error(
        `Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format ` +
          `<count>[ms|s|m|h|d|w|M|y] (e.g. '70ms', '5s', '3d', '1y', '1m30s'), where the duration is a safe positive integer.`
      );
    }
    return numberToDuration(number);
  }

  const count = parseInt(result[1], 10);
  const unit = result[2] as TimeUnitString;
  const rest = result[3];

  const duration = momentDuration(count, unit as Exclude<TimeUnitString, 'Y'>); // Moment still supports capital 'Y', but officially (and type-wise), it doesn't.

  if (rest) {
    return duration.add(stringToDuration(rest));
  }
  return duration;
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
