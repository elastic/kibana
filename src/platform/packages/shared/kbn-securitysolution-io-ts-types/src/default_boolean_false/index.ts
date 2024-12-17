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
 * Types the DefaultBooleanFalse as:
 *   - If null or undefined, then a default false will be set
 */
export const DefaultBooleanFalse = new t.Type<boolean, boolean | undefined, unknown>(
  'DefaultBooleanFalse',
  t.boolean.is,
  (input, context): Either<t.Errors, boolean> =>
    input == null ? t.success(false) : t.boolean.validate(input, context),
  t.identity
);
