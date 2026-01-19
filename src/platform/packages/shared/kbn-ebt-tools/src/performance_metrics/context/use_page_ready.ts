/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import type { CustomMetrics, Meta } from './performance_context';
import { usePerformanceContext } from '../../..';

interface UsePageReadyProps {
  customMetrics?: CustomMetrics;
  isReady: boolean;
  meta?: Meta;
  isRefreshing: boolean;
  customInitialLoad?: { value: boolean; onInitialLoadReported: () => void };
}

export const usePageReady = ({
  customInitialLoad,
  isReady,
  isRefreshing,
  customMetrics,
  meta,
}: UsePageReadyProps) => {
  const { onPageReady, onPageRefreshStart } = usePerformanceContext();
  const prevIsRefreshing = usePrevious(isRefreshing);
  const [isInitialLoadInternal, setIsInitialLoadInternal] = useState(true);

  const isInitialLoad = customInitialLoad ? customInitialLoad.value : isInitialLoadInternal;

  useEffect(() => {
    // Skip until either the page is ready for the first time or a refresh cycle begins
    if (isInitialLoad && !isReady) return;

    // Initial load flow
    if (isReady && isInitialLoad) {
      onPageReady({ customMetrics, meta });
      customInitialLoad?.onInitialLoadReported();
      setIsInitialLoadInternal(false);
      return;
    }

    // Refresh flow (only after the initial load has been reported)
    if (!prevIsRefreshing && isRefreshing) {
      onPageRefreshStart();
    } else if (prevIsRefreshing && !isRefreshing) {
      onPageReady({ customMetrics, meta });
    }
  }, [
    customInitialLoad,
    customMetrics,
    isInitialLoad,
    isReady,
    isRefreshing,
    meta,
    onPageReady,
    onPageRefreshStart,
    prevIsRefreshing,
  ]);
};
