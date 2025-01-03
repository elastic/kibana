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
 * Types the DefaultBooleanTrue as:
 *   - If null or undefined, then a default true will be set
 */
export const DefaultBooleanTrue = new t.Type<boolean, boolean | undefined, unknown>(
  'DefaultBooleanTrue',
  t.boolean.is,
  (input, context): Either<t.Errors, boolean> =>
    input == null ? t.success(true) : t.boolean.validate(input, context),
  t.identity
);
