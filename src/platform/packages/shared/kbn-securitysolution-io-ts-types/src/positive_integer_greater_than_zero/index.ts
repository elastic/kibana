/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Types the positive integer greater than zero is:
 *   - Natural Number (positive integer and not a float),
 *   - 1 or greater
 */
export const PositiveIntegerGreaterThanZero = new t.Type<number, number, unknown>(
  'PositiveIntegerGreaterThanZero',
  t.number.is,
  (input, context): Either<t.Errors, number> => {
    return typeof input === 'number' && Number.isSafeInteger(input) && input >= 1
      ? t.success(input)
      : t.failure(input, context);
  },
  t.identity
);
