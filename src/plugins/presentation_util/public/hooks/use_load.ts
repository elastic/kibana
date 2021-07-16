/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';

interface UseLoadResult<T> {
  loading: boolean;
  error: any;
  data: T | null;
}

const isFn = (fn: any) => typeof fn === 'function';

export function useLoad<T = {}>(asyncFn: () => Promise<T> | undefined): UseLoadResult<T> {
  const [loading, setLoading] = useState<boolean>(isFn(asyncFn));
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<T | null>(null);

  const callAsyncFn = useCallback(async () => {
    if (!isFn(asyncFn)) return;

    try {
      const fnResult = await asyncFn();
      setData(fnResult ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  useEffect(() => {
    callAsyncFn();
  }, [callAsyncFn]);

  return { data, loading, error };
}
