/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { CustomMetrics, Meta } from './performance_context';
import { usePerformanceContext } from '../../..';

interface UsePageReadyProps {
  customMetrics?: CustomMetrics;
  isReady: boolean;
  meta?: Meta;
  isRefreshing: boolean;
  customInitialLoadReported?: { value: boolean; onInitialLoadReported: () => void };
}

// Generic hook to store the previous value of a variable
const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

export const usePageReady = ({
  customInitialLoadReported,
  isReady,
  isRefreshing,
  customMetrics,
  meta,
}: UsePageReadyProps) => {
  const { onPageReady, onPageRefreshStart } = usePerformanceContext();
  const prevIsRefreshing = usePrevious(isRefreshing);
  const [isInitialLoadReportedInternal, setIsInitialLoadReportedInternal] = useState(false);

  const isInitialLoadReported = customInitialLoadReported
    ? customInitialLoadReported.value
    : isInitialLoadReportedInternal;

  useEffect(() => {
    // Skip until either the page is ready for the first time or a refresh cycle begins
    if (!isInitialLoadReported && !isReady) return;

    // Initial load flow
    if (isReady && !isInitialLoadReported) {
      onPageReady({ customMetrics, meta });
      customInitialLoadReported?.onInitialLoadReported();
      setIsInitialLoadReportedInternal(true);
      return;
    }

    // Refresh flow (only after the initial load has been reported)
    if (!prevIsRefreshing && isRefreshing) {
      onPageRefreshStart();
    } else if (prevIsRefreshing && !isRefreshing) {
      onPageReady({ customMetrics, meta });
    }
  }, [
    customInitialLoadReported,
    customMetrics,
    isInitialLoadReported,
    isReady,
    isRefreshing,
    meta,
    onPageReady,
    onPageRefreshStart,
    prevIsRefreshing,
  ]);
};
