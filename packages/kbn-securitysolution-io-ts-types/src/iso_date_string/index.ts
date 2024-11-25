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
 * Types the IsoDateString as:
 *   - A string that is an ISOString
 */
export type IsoDateString = t.TypeOf<typeof IsoDateString>;
export const IsoDateString = new t.Type<string, string, unknown>(
  'IsoDateString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (typeof input === 'string') {
      try {
        const parsed = new Date(input);
        if (parsed.toISOString() === input) {
          return t.success(input);
        } else {
          return t.failure(input, context);
        }
      } catch (err) {
        return t.failure(input, context);
      }
    } else {
      return t.failure(input, context);
    }
  },
  t.identity
);

export type IsoDateStringC = typeof IsoDateString;
