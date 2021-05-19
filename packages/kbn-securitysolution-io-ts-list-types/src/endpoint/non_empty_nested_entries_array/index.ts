/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { endpointEntryMatch } from '../entry_match';
import { endpointEntryMatchAny } from '../entry_match_any';

export const endpointNestedEntriesArray = t.array(
  t.union([endpointEntryMatch, endpointEntryMatchAny])
);
export type EndpointNestedEntriesArray = t.TypeOf<typeof endpointNestedEntriesArray>;

/**
 * Types the nonEmptyNestedEntriesArray as:
 *   - An array of entries of length 1 or greater
 *
 */
export const nonEmptyEndpointNestedEntriesArray = new t.Type<
  EndpointNestedEntriesArray,
  EndpointNestedEntriesArray,
  unknown
>(
  'NonEmptyEndpointNestedEntriesArray',
  (u: unknown): u is EndpointNestedEntriesArray => endpointNestedEntriesArray.is(u) && u.length > 0,
  (input, context): Either<t.Errors, EndpointNestedEntriesArray> => {
    if (Array.isArray(input) && input.length === 0) {
      return t.failure(input, context);
    } else {
      return endpointNestedEntriesArray.validate(input, context);
    }
  },
  t.identity
);

export type NonEmptyEndpointNestedEntriesArray = t.OutputOf<
  typeof nonEmptyEndpointNestedEntriesArray
>;
export type NonEmptyEndpointNestedEntriesArrayDecoded = t.TypeOf<
  typeof nonEmptyEndpointNestedEntriesArray
>;
