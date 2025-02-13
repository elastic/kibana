/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { CustomMetrics, Meta } from './performance_context';
import { usePerformanceContext } from '../../..';

export const usePageReady = (state: {
  customMetrics?: CustomMetrics;
  isReady: boolean;
  meta?: Meta;
}) => {
  const { onPageReady } = usePerformanceContext();

  const [isReported, setIsReported] = useState(false);

  useEffect(() => {
    if (state.isReady && !isReported) {
      onPageReady({ customMetrics: state.customMetrics, meta: state.meta });
      setIsReported(true);
    }
  }, [isReported, onPageReady, state.customMetrics, state.isReady, state.meta]);
};
