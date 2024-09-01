/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { CustomMetrics } from './performance_context';
import { usePerformanceContext } from '../../..';

export const usePageReady = (state: { customMetrics?: CustomMetrics; isReady: boolean }) => {
  const { onPageReady } = usePerformanceContext();

  const [isReported, setIsReported] = useState(false);

  useEffect(() => {
    if (state.isReady && !isReported) {
      onPageReady(state.customMetrics);
      setIsReported(true);
    }
  }, [isReported, onPageReady, state.customMetrics, state.isReady]);
};
