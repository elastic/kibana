/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export interface SynchronizeMigratorsParams<T, U> {
  waitGroup: WaitGroup<T>;
  thenHook?: (res: any) => Either.Right<U>;
  payload?: T;
}

export function synchronizeMigrators<T, U>({
  waitGroup,
  payload,
  thenHook = () =>
    Either.right(
      'synchronized_successfully' as const
    ) as Either.Right<'synchronized_successfully'> as unknown as Either.Right<U>,
}: SynchronizeMigratorsParams<T, U>): TaskEither.TaskEither<SynchronizationFailed, U> {
  return () => {
    waitGroup.resolve(payload);
    return waitGroup.promise
      .then((res) => (thenHook ? thenHook(res) : res))
      .catch((error) => Either.left({ type: 'synchronization_failed' as const, error }));
  };
}
