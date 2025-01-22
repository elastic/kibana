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
 * Types the NonEmptyString as:
 *   - A string that is not empty
 */
export const NonEmptyString = new t.Type<string, string, unknown>(
  'NonEmptyString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string' && input.trim() !== '') {
      return t.success(input);
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export type NonEmptyStringC = typeof NonEmptyString;
