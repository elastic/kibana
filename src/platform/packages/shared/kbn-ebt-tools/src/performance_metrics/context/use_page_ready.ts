/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { CustomMetrics, Meta } from './performance_context';
import { usePerformanceContext } from '../../..';

interface UsePageReadyProps {
  customMetrics?: CustomMetrics;
  isReady: boolean;
  meta?: Meta;
  onInitialLoadReported: () => void;
  isInitialLoadReported: boolean;
  isRefreshing: boolean;
}

export const usePageReady = ({
  isInitialLoadReported,
  isReady,
  isRefreshing,
  onInitialLoadReported,
  customMetrics,
  meta,
}: UsePageReadyProps) => {
  const { onPageReady, onPageRefreshStart } = usePerformanceContext();
  const prevIsRefreshing = useRef<boolean>(false);

  useEffect(() => {
    // We don't want to do anything here if the initial load has not been reported yet
    // This hook is to report the refresh load
    if (!isInitialLoadReported) return;

    if (!prevIsRefreshing.current && isRefreshing) {
      onPageRefreshStart();
    } else if (prevIsRefreshing.current && !isRefreshing) {
      // Only call onPageReady when isRefreshing changes from true to false
      onPageReady({ customMetrics, meta });
    }

    // Update the previous value
    prevIsRefreshing.current = isRefreshing;
  }, [customMetrics, isInitialLoadReported, isRefreshing, meta, onPageReady, onPageRefreshStart]);

  useEffect(() => {
    if (isReady && !isInitialLoadReported) {
      onPageReady({ customMetrics, meta });
      onInitialLoadReported();
    }
  }, [customMetrics, isInitialLoadReported, isReady, meta, onInitialLoadReported, onPageReady]);
};
