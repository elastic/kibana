/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { WaitGroup } from '../kibana_migrator_utils';

/** @internal */
export interface SynchronizationFailed {
  type: 'synchronization_failed';
  error: Error;
}

/** @internal */
export interface SynchronizationSuccessful<T> {
  type: 'synchronization_successful';
  data: T[];
}

/** @internal */
export interface SynchronizeMigratorsParams<T> {
  waitGroup: WaitGroup<T>;
  payload?: T;
}

export function synchronizeMigrators<T>({
  waitGroup,
  payload,
}: SynchronizeMigratorsParams<T>): TaskEither.TaskEither<
  SynchronizationFailed,
  SynchronizationSuccessful<T>
> {
  return () => {
    waitGroup.resolve(payload);
    return waitGroup.promise
      .then((data: T[]) => Either.right({ type: 'synchronization_successful' as const, data }))
      .catch((error) => Either.left({ type: 'synchronization_failed' as const, error }));
  };
}
