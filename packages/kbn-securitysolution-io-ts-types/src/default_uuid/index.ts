/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { v4 as uuid } from 'uuid';
import { NonEmptyString } from '../non_empty_string';

/**
 * Types the DefaultUuid as:
 *   - If null or undefined, then a default string uuid() will be
 *     created otherwise it will be checked just against an empty string
 */
export const DefaultUuid = new t.Type<string, string | undefined, unknown>(
  'DefaultUuid',
  t.string.is,
  (input, context): Either<t.Errors, string> =>
    input == null ? t.success(uuid()) : NonEmptyString.validate(input, context),
  t.identity
);
