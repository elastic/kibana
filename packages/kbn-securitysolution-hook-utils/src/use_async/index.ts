/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';

import { Task } from '../types';
import { useIsMounted } from '../use_is_mounted';

/**
 *
 * This hook wraps a promise-returning thunk (task) in order to conditionally
 * initiate the work, and automatically provide state corresponding to the
 * task's status.
 *
 * In order to function properly and not rerender unnecessarily, ensure that
 * your task is a stable function reference.
 *
 * @param fn a function returning a promise.
 *
 * @returns An {@link Task} containing the task's current state along with a
 * start callback
 */
export const useAsync = <Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>
): Task<Args, Result> => {
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const [result, setResult] = useState<Result | undefined>();

  const start = useCallback(
    (...args: Args) => {
      setLoading(true);
      setResult(undefined);
      setError(undefined);
      fn(...args)
        .then((r) => isMounted() && setResult(r))
        .catch((e) => isMounted() && setError(e))
        .finally(() => isMounted() && setLoading(false));
    },
    [fn, isMounted]
  );

  return {
    error,
    loading,
    result,
    start,
  };
};
