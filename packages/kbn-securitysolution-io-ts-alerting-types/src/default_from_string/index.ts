/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { From } from '../from';

/**
 * Types the DefaultFromString as:
 *   - If null or undefined, then a default of the string "now-6m" will be used
 */
export const DefaultFromString = new t.Type<string, string | undefined, unknown>(
  'DefaultFromString',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (input == null) {
      return t.success('now-6m');
    }
    return From.validate(input, context);
  },
  t.identity
);
