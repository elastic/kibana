/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { CustomMetrics, Meta } from './performance_context';
import { usePerformanceContext } from '../../..';

interface UsePageReadyProps {
  customMetrics?: CustomMetrics;
  isReady: boolean;
  meta?: Meta;
  onInitialLoadReported: () => void;
  isInitialLoadReported: boolean;
}

export const usePageReady = ({
  isInitialLoadReported,
  isReady,
  onInitialLoadReported,
  customMetrics,
  meta,
}: UsePageReadyProps) => {
  const { onPageReady } = usePerformanceContext();

  useEffect(() => {
    if (isReady && !isInitialLoadReported) {
      onPageReady({ customMetrics, meta });
      onInitialLoadReported();
    }
  }, [customMetrics, isInitialLoadReported, isReady, meta, onInitialLoadReported, onPageReady]);
};
