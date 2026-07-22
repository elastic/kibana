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
import type { ExportJsonSanitizedState, ExportJsonStatus, SanitizeStateFunction } from './types';

export type UseSanitizedStateResult<SanitizedState extends object> =
  ExportJsonSanitizedState<SanitizedState> & {
    retry: () => void;
  };

export function useSanitizedState<State extends object, SanitizedState extends object>({
  state,
  sanitizeState,
}: {
  state: State;
  sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}): UseSanitizedStateResult<SanitizedState> {
  const [status, setStatus] = useState<ExportJsonStatus>('loading');
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<SanitizedState | undefined>(undefined);
  const [warnings, setWarnings] = useState<string[]>([]);
  // reloadCount is used to trigger a reload of the state when retry is called
  const [reloadCount, setReloadCount] = useState(0);

  const [debouncedState, setDebouncedState] = useState<ExportJsonSanitizedState<SanitizedState>>({
    status,
    error,
    data,
    warnings,
  });

  // debounce state changes to prevent "blip" of loading spinner, especially when toggling isByReference
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (status === 'loading') {
      timer = setTimeout(() => {
        setDebouncedState({ status, error, data, warnings });
      }, 250);
    } else {
      setDebouncedState({ status, error, data, warnings });
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, error, data, warnings]);

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
      .then((response) => {
        if (!isMounted) return;
        setWarnings(response.warnings.map(({ message }) => message));
        setData(response.data);
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

  return { ...debouncedState, retry };
}
