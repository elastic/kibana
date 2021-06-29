/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/Either';
import { RetryableEsClientError } from '../actions';

export type ExcludeRetryableEsError<Response> = Exclude<
  | Exclude<
      Response,
      Either.Either<Response extends Either.Left<unknown> ? Response['left'] : never, never>
    >
  | Either.Either<
      Exclude<
        Response extends Either.Left<unknown> ? Response['left'] : never,
        RetryableEsClientError
      >,
      Response extends Either.Right<unknown> ? Response['right'] : never
    >,
  Either.Left<never>
>;
