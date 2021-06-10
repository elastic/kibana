/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useState } from 'react';

import { useIsMounted } from '../use_is_mounted';

export interface Async<Args extends unknown[], Result> {
  loading: boolean;
  error: unknown | undefined;
  result: Result | undefined;
  start: (...args: Args) => void;
}

/**
 *
 * @param fn Async function
 *
 * @returns An {@link AsyncTask} containing the underlying task's state along with a start callback
 */
export const useAsync = <Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>
): Async<Args, Result> => {
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
