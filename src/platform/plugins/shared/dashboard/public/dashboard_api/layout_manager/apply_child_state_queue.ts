/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchError, concatMap, EMPTY, from, Subject, tap } from 'rxjs';
import type { MaybePromise } from '@kbn/utility-types';

import type { initializeChildrenStateLoading } from './children_state_loading';

interface ApplyStateJob {
  run: () => MaybePromise<unknown>;
  resolve: (result: unknown) => void;
  reject: (error: unknown) => void;
}

/**
 * Runs async child state work one job at a time, in the order jobs were enqueued.
 * Only the async `applySerializedState` step belongs here. Layout and `currentChildState`
 * updates stay synchronous in the caller. Don't enqueue work that may never settle,
 * since it would block every later job.
 */
export function initializeApplyChildStateQueue(
  setChildrenStateLoadingWhile: ReturnType<
    typeof initializeChildrenStateLoading
  >['setChildrenStateLoadingWhile']
) {
  const jobs$ = new Subject<ApplyStateJob>();

  const subscription = jobs$
    .pipe(
      concatMap((job) =>
        // the async wrapper turns a synchronous throw from job.run into a rejection
        from((async () => job.run())()).pipe(
          tap({ next: job.resolve }),
          catchError((error) => {
            job.reject(error);
            return EMPTY;
          })
        )
      )
    )
    .subscribe();

  /**
   * Queues `run` behind any earlier jobs. Loading is flagged synchronously and stays flagged
   * while the job waits and runs. The returned promise resolves with the job's result and
   * rejects if it throws.
   */
  const enqueue = <T>(run: () => MaybePromise<T>): Promise<T> =>
    setChildrenStateLoadingWhile(
      () =>
        new Promise<T>((resolve, reject) => {
          jobs$.next({ run, resolve: resolve as (result: unknown) => void, reject });
        })
    );

  return {
    enqueue,
    cleanup: () => subscription.unsubscribe(),
  };
}
