/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardState } from '../../server';
import { sanitizeDashboard } from './sanitize_dashboard';
import type { ExportJsonLoadState } from './export_json_types';

export function useSanitizedDashboardState({
  dashboardState,
  onLoadStart,
}: {
  dashboardState: DashboardState;
  onLoadStart?: () => void;
}): { loadState: ExportJsonLoadState; retry: () => void } {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [data, setData] = useState<DashboardState | undefined>(undefined);
  const [warnings, setWarnings] = useState<string[]>([]);
  // reloadCount is used to trigger a reload of the dashboard state when retry is called
  const [reloadCount, setReloadCount] = useState(0);

  const retry = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setErrorMessage(undefined);
    setData(undefined);
    setWarnings([]);
    onLoadStart?.();

    sanitizeDashboard(dashboardState)
      .then(({ data: responseData, warnings: responseWarnings }) => {
        if (!isMounted) return;
        setWarnings(responseWarnings.map(({ message }) => message));
        setData(responseData);
        setIsLoading(false);
      })
      .catch((e) => {
        if (!isMounted) return;
        setErrorMessage(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardState, reloadCount, onLoadStart]);

  const loadState = useMemo<ExportJsonLoadState>(() => {
    if (isLoading) return { status: 'loading' };
    if (errorMessage !== undefined) return { status: 'error', errorMessage };
    if (data === undefined) return { status: 'error', errorMessage: 'Unknown error' };
    return { status: 'success', data, warnings };
  }, [data, errorMessage, isLoading, warnings]);

  return { loadState, retry };
}
