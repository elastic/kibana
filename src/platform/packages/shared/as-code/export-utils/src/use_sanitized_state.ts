/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { apm } from '@elastic/apm-rum';
import type { ExportJsonSanitizedState, ExportJsonStatus } from './types';

export type UseSanitizedStateResult<SanitizedState extends object> =
  ExportJsonSanitizedState<SanitizedState> & {
    retry: () => void;
  };

export function useSanitizedState<State extends object, SanitizedState extends object>({
  state,
  sanitizeState,
}: {
  state: State;
  sanitizeState: (
    state: State
  ) => Promise<{ data: SanitizedState; warnings: Array<{ message: string }> }>;
}): UseSanitizedStateResult<SanitizedState> {
  const [status, setStatus] = useState<ExportJsonStatus>('loading');
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<SanitizedState | undefined>(undefined);
  const [warnings, setWarnings] = useState<string[]>([]);
  // reloadCount is used to trigger a reload of the state when retry is called
  const [reloadCount, setReloadCount] = useState(0);

  const retry = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    setStatus('loading');
    setError(undefined);
    setData(undefined);
    setWarnings([]);

    sanitizeState(state)
      .then(({ data: responseData, warnings: responseWarnings }) => {
        // console.log({ data, responseWarnings });
        if (!isMounted) return;
        setWarnings(responseWarnings.map(({ message }) => message));
        setData(responseData);
        setStatus('success');
      })
      .catch((e) => {
        if (!isMounted) return;
        const err = e instanceof Error ? e : new Error(String(e));
        apm.captureError(err, {
          labels: {
            error_type: 'SanitizeDashboardFailure',
          },
        });
        setError(err);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [state, reloadCount, sanitizeState]);

  return { status, data, warnings, error, retry };
}
