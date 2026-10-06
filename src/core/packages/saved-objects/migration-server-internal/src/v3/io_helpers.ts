/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as E from 'fp-ts/Either';
import type * as TE from 'fp-ts/TaskEither';
import { isTypeof } from '../actions';

export interface RetryableFailureResponse {
  readonly type: 'retryable_failure';
  readonly message: string;
}

export const runTaskEither = async <L, R>(te: TE.TaskEither<L, R>): Promise<E.Either<L, R>> => te();

export const mapRetryableFailure = <L extends { type: string }, R>(
  either: E.Either<L, R>
): E.Either<L | RetryableFailureResponse, R> => {
  if (E.isLeft(either) && isTypeof(either.left, 'retryable_es_client_error')) {
    return E.left({
      type: 'retryable_failure',
      message: either.left.message,
    } as RetryableFailureResponse);
  }
  return either;
};

export const adaptEither = async <L extends { type: string }, R, TResponse>(
  te: TE.TaskEither<L, R>,
  mapRight: (right: R) => TResponse,
  mapLeft: (left: Exclude<L, { type: 'retryable_es_client_error' }>) => TResponse
): Promise<TResponse | RetryableFailureResponse> => {
  const either = mapRetryableFailure(await runTaskEither(te));
  if (E.isRight(either)) {
    return mapRight(either.right);
  }
  const left = either.left;
  if (isTypeof(left as L, 'retryable_es_client_error')) {
    return left as RetryableFailureResponse;
  }
  if ((left as RetryableFailureResponse).type === 'retryable_failure') {
    return left as RetryableFailureResponse;
  }
  return mapLeft(left as Exclude<L, { type: 'retryable_es_client_error' }>);
};
