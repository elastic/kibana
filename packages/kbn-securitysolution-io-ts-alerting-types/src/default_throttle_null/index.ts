/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { throttle, ThrottleOrNull } from '../throttle';

/**
 * Types the DefaultThrottleNull as:
 *   - If null or undefined, then a null will be set
 */
export const DefaultThrottleNull = new t.Type<ThrottleOrNull, ThrottleOrNull | undefined, unknown>(
  'DefaultThreatNull',
  throttle.is,
  (input, context): Either<t.Errors, ThrottleOrNull> =>
    input == null ? t.success(null) : throttle.validate(input, context),
  t.identity
);
