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
 * Types the NonEmptyStringArray as:
 *   - A string that is not empty (which will be turned into an array of size 1)
 *   - A comma separated string that can turn into an array by splitting on it
 *   - Example input converted to output: "a,b,c" -> ["a", "b", "c"]
 */
export const NonEmptyStringArray = new t.Type<string[], string, unknown>(
  'NonEmptyStringArray',
  t.array(t.string).is,
  (input, context): Either<t.Errors, string[]> => {
    if (typeof input === 'string' && input.trim() !== '') {
      const arrayValues = input
        .trim()
        .split(',')
        .map((value) => value.trim());
      const emptyValueFound = arrayValues.some((value) => value === '');
      if (emptyValueFound) {
        return t.failure(input, context);
      } else {
        return t.success(arrayValues);
      }
    } else {
      return t.failure(input, context);
    }
  },
  String
);

export type NonEmptyStringArray = t.OutputOf<typeof NonEmptyStringArray>;

export type NonEmptyStringArrayDecoded = t.TypeOf<typeof NonEmptyStringArray>;
