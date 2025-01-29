/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { DependencyList, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

interface UseTrackedPromiseArgs<Arguments extends any[], Result> {
  createPromise: (...args: Arguments) => Promise<Result>;
  onResolve?: (result: Result) => void;
  onReject?: (value: unknown) => void;
  cancelPreviousOn?: 'creation' | 'settlement' | 'resolution' | 'rejection' | 'never';
  triggerOrThrow?: 'always' | 'whenMounted';
}

/**
 * This hook manages a Promise factory and can create new Promises from it. The
 * state of these Promises is tracked and they can be canceled when superseded
 * to avoid race conditions.
 *
 * ```
 * const [requestState, performRequest] = useTrackedPromise(
 *   {
 *     cancelPreviousOn: 'resolution',
 *     createPromise: async (url: string) => {
 *       return await fetchSomething(url)
 *     },
 *     onResolve: response => {
 *       setSomeState(response.data);
 *     },
 *     onReject: response => {
 *       setSomeError(response);
 *     },
 *   },
 *   [fetchSomething]
 * );
 * ```
 *
 * The `onResolve` and `onReject` handlers are registered separately, because
 * the hook will inject a rejection when in case of a canellation. The
 * `cancelPreviousOn` attribute can be used to indicate when the preceding
 * pending promises should be canceled:
 *
 * 'never': No preceding promises will be canceled.
 *
 * 'creation': Any preceding promises will be canceled as soon as a new one is
 * created.
 *
 * 'settlement': Any preceding promise will be canceled when a newer promise is
 * resolved or rejected.
 *
 * 'resolution': Any preceding promise will be canceled when a newer promise is
 * resolved.
 *
 * 'rejection': Any preceding promise will be canceled when a newer promise is
 * rejected.
 *
 * Any pending promises will be canceled when the component using the hook is
 * unmounted, but their status will not be tracked to avoid React warnings
 * about memory leaks.
 *
 * The last argument is a normal React hook dependency list that indicates
 * under which conditions a new reference to the configuration object should be
 * used.
 *
 * The `onResolve`, `onReject` and possible uncatched errors are only triggered
 * if the underlying component is mounted. To ensure they always trigger (i.e.
 * if the promise is called in a `useLayoutEffect`) use the `triggerOrThrow`
 * attribute:
 *
 * 'whenMounted': (default) they are called only if the component is mounted.
 *
 * 'always': they always call. The consumer is then responsible of ensuring no
 * side effects happen if the underlying component is not mounted.
 */
export const useTrackedPromise = <Arguments extends any[], Result>(
  {
    createPromise,
    onResolve = noOp,
    onReject = noOp,
    cancelPreviousOn = 'never',
    triggerOrThrow = 'whenMounted',
  }: UseTrackedPromiseArgs<Arguments, Result>,
  dependencies: DependencyList
) => {
  const isComponentMounted = useMountedState();
  const shouldTriggerOrThrow = useCallback(() => {
    switch (triggerOrThrow) {
      case 'always':
        return true;
      case 'whenMounted':
        return isComponentMounted();
    }
  }, [isComponentMounted, triggerOrThrow]);

  /**
   * If a promise is currently pending, this holds a reference to it and its
   * cancellation function.
   */
  const pendingPromises = useRef<ReadonlyArray<CancelablePromise<Result>>>([]);

  /**
   * The state of the promise most recently created by the `createPromise`
   * factory. It could be uninitialized, pending, resolved or rejected.
   */
  const [promiseState, setPromiseState] = useState<PromiseState<Result>>({
    state: 'uninitialized',
  });

  const reset = useCallback(() => {
    setPromiseState({
      state: 'uninitialized',
    });
  }, []);

  const execute = useMemo(
    () =>
      (...args: Arguments) => {
        let rejectCancellationPromise!: (value: any) => void;
        const cancellationPromise = new Promise<any>((_, reject) => {
          rejectCancellationPromise = reject;
        });

        // remember the list of prior pending promises for cancellation
        const previousPendingPromises = pendingPromises.current;

        const cancelPreviousPendingPromises = () => {
          previousPendingPromises.forEach((promise) => promise.cancel());
        };

        const newPromise = createPromise(...args);
        const newCancelablePromise = Promise.race([newPromise, cancellationPromise]);

        // track this new state
        setPromiseState({
          state: 'pending',
          promise: newCancelablePromise,
        });

        if (cancelPreviousOn === 'creation') {
          cancelPreviousPendingPromises();
        }

        const newPendingPromise: CancelablePromise<Result> = {
          cancel: () => {
            rejectCancellationPromise(new CanceledPromiseError());
          },
          cancelSilently: () => {
            rejectCancellationPromise(new SilentCanceledPromiseError());
          },
          promise: newCancelablePromise.then(
            (value) => {
              if (['settlement', 'resolution'].includes(cancelPreviousOn)) {
                cancelPreviousPendingPromises();
              }

              // remove itself from the list of pending promises
              pendingPromises.current = pendingPromises.current.filter(
                (pendingPromise) => pendingPromise.promise !== newPendingPromise.promise
              );

              if (onResolve && shouldTriggerOrThrow()) {
                onResolve(value);
              }

              setPromiseState((previousPromiseState) =>
                previousPromiseState.state === 'pending' &&
                previousPromiseState.promise === newCancelablePromise
                  ? {
                      state: 'resolved',
                      promise: newPendingPromise.promise,
                      value,
                    }
                  : previousPromiseState
              );

              return value;
            },
            (value) => {
              if (!(value instanceof SilentCanceledPromiseError)) {
                if (['settlement', 'rejection'].includes(cancelPreviousOn)) {
                  cancelPreviousPendingPromises();
                }

                // remove itself from the list of pending promises
                pendingPromises.current = pendingPromises.current.filter(
                  (pendingPromise) => pendingPromise.promise !== newPendingPromise.promise
                );

                if (shouldTriggerOrThrow()) {
                  if (onReject) {
                    onReject(value);
                  } else {
                    throw value;
                  }
                }

                setPromiseState((previousPromiseState) =>
                  previousPromiseState.state === 'pending' &&
                  previousPromiseState.promise === newCancelablePromise
                    ? {
                        state: 'rejected',
                        promise: newCancelablePromise,
                        value,
                      }
                    : previousPromiseState
                );
              }
            }
          ),
        };

        // add the new promise to the list of pending promises
        pendingPromises.current = [...pendingPromises.current, newPendingPromise];

        // silence "unhandled rejection" warnings
        newPendingPromise.promise.catch(noOp);

        return newPendingPromise.promise;
      },
    // the dependencies are managed by the caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  /**
   * Cancel any pending promises silently to avoid memory leaks and race
   * conditions.
   */
  useEffect(
    () => () => {
      pendingPromises.current.forEach((promise) => promise.cancelSilently());
    },
    []
  );

  return [promiseState, execute, reset] as [typeof promiseState, typeof execute, typeof reset];
};

export interface UninitializedPromiseState {
  state: 'uninitialized';
}

export interface PendingPromiseState<ResolvedValue> {
  state: 'pending';
  promise: Promise<ResolvedValue>;
}

export interface ResolvedPromiseState<ResolvedValue> {
  state: 'resolved';
  promise: Promise<ResolvedValue>;
  value: ResolvedValue;
}

export interface RejectedPromiseState<ResolvedValue, RejectedValue> {
  state: 'rejected';
  promise: Promise<ResolvedValue>;
  value: RejectedValue;
}

export type SettledPromiseState<ResolvedValue, RejectedValue> =
  | ResolvedPromiseState<ResolvedValue>
  | RejectedPromiseState<ResolvedValue, RejectedValue>;

export type PromiseState<ResolvedValue, RejectedValue = unknown> =
  | UninitializedPromiseState
  | PendingPromiseState<ResolvedValue>
  | SettledPromiseState<ResolvedValue, RejectedValue>;

export const isRejectedPromiseState = (
  promiseState: PromiseState<any, any>
): promiseState is RejectedPromiseState<any, any> => promiseState.state === 'rejected';

interface CancelablePromise<ResolvedValue> {
  // reject the promise prematurely with a CanceledPromiseError
  cancel: () => void;
  // reject the promise prematurely with a SilentCanceledPromiseError
  cancelSilently: () => void;
  // the tracked promise
  promise: Promise<ResolvedValue>;
}

export class CanceledPromiseError extends Error {
  public isCanceled = true;

  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SilentCanceledPromiseError extends CanceledPromiseError {}

const noOp = () => undefined;
