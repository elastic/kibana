/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { DashboardState } from '../../server';
import { sanitizeDashboard } from './sanitize_dashboard';
import type { ExportJsonSanitizedState, ExportJsonStatus } from './types';

export type UseSanitizedDashboardStateResult = ExportJsonSanitizedState & { retry: () => void };

export function useSanitizedDashboardState({
  dashboardState,
}: {
  dashboardState: DashboardState;
}): UseSanitizedDashboardStateResult {
  const [status, setStatus] = useState<ExportJsonStatus>('loading');
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<DashboardState | undefined>(undefined);
  const [warnings, setWarnings] = useState<string[]>([]);
  // reloadCount is used to trigger a reload of the dashboard state when retry is called
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

    sanitizeDashboard(dashboardState)
      .then(({ data: responseData, warnings: responseWarnings }) => {
        if (!isMounted) return;
        setWarnings(responseWarnings.map(({ message }) => message));
        setData(responseData);
        setStatus('success');
      })
      .catch((e) => {
        if (!isMounted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardState, reloadCount]);

  return { status, data, warnings, error, retry };
}
