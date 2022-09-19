/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the TimeDuration as:
 *   - A string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time
 *   - in the format {safe_integer}{timeUnit}, e.g. "30s", "1m", "2h"
 */
export const TimeDuration = new t.Type<string, string, unknown>(
  'TimeDuration',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string' && input.trim() !== '') {
      try {
        const inputLength = input.length;
        const time = parseInt(input.trim().substring(0, inputLength - 1), 10);
        const unit = input.trim().at(-1);
        if (
          time >= 1 &&
          Number.isSafeInteger(time) &&
          (unit === 's' || unit === 'm' || unit === 'h')
        ) {
          return t.success(input);
        } else {
          return t.failure(input, context);
        }
      } catch (error) {
        return t.failure(input, context);
      }
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export type TimeDurationC = typeof TimeDuration;
