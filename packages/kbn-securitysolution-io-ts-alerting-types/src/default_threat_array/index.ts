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
import { threats, Threats } from '../threat';

/**
 * Types the DefaultThreatArray as:
 *   - If null or undefined, then an empty array will be set
 */
export const DefaultThreatArray = new t.Type<Threats, Threats | undefined, unknown>(
  'DefaultThreatArray',
  threats.is,
  (input, context): Either<t.Errors, Threats> =>
    input == null ? t.success([]) : threats.validate(input, context),
  t.identity
);
