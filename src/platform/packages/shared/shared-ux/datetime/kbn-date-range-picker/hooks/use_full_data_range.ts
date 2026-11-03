/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { TimeRangeBounds } from '../types';

/** Outcome of the last full data range request. */
export type FullDataRangeStatus = 'idle' | 'loading' | 'noData' | 'error';

interface UseFullDataRangeArgs {
  /** Resolves the full data range, or `null` when there is no data. */
  getFullDataRange?: (signal: AbortSignal) => Promise<TimeRangeBounds | null>;
  /** Called with the resolved range. */
  onResolved: (range: TimeRangeBounds) => void;
}

interface UseFullDataRangeResult {
  /** Current request status. */
  status: FullDataRangeStatus;
  /** Starts a request, aborting any one in flight. */
  requestFullDataRange: () => Promise<void>;
}

/**
 * Runs the consumer-provided `getFullDataRange` callback and tracks its status.
 * The in-flight request is aborted when a new one starts or on unmount.
 */
export const useFullDataRange = ({
  getFullDataRange,
  onResolved,
}: UseFullDataRangeArgs): UseFullDataRangeResult => {
  const [status, setStatus] = useState<FullDataRangeStatus>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const requestFullDataRange = useCallback(async () => {
    if (!getFullDataRange) return;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setStatus('loading');

    try {
      const range = await getFullDataRange(abortController.signal);
      if (abortController.signal.aborted) return;
      if (!range) {
        setStatus('noData');
        return;
      }
      setStatus('idle');
      onResolved(range);
    } catch (error) {
      if (abortController.signal.aborted) return;
      setStatus('error');
    }
  }, [getFullDataRange, onResolved]);

  return { status, requestFullDataRange };
};
