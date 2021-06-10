/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Observable, Subscription } from 'rxjs';

import { useIsMounted } from '../use_is_mounted';
import { Task } from '../types';

/**
 *
 * @param fn function returning an observable
 *
 * @returns An {@link Async} containing the underlying task's state along with a start callback
 */
export const useObservable = <Args extends unknown[], Result>(
  fn: (...args: Args) => Observable<Result>
): Task<Args, Result> => {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const [result, setResult] = useState<Result | undefined>();
  const subRef = useRef<Subscription | undefined>();

  const start = useCallback(
    (...args: Args) => {
      subRef.current?.unsubscribe();
      setLoading(true);
      setResult(undefined);
      setError(undefined);

      subRef.current = fn(...args).subscribe(
        (r) => {
          if (isMounted()) {
            setResult(r);
            setLoading(false);
          }
        },
        (e) => {
          if (isMounted()) {
            setError(e);
            setLoading(false);
          }
        }
      );
    },
    [fn, isMounted]
  );

  useEffect(
    () => () => {
      subRef.current?.unsubscribe();
    },
    []
  );

  return {
    error,
    loading,
    result,
    start,
  };
};
