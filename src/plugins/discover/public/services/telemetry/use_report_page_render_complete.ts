/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';

let isInitialRenderComplete = false;

export const useReportPageRenderComplete = (isReady: boolean = false) => {
  const context = usePerformanceContext({ suppressMissingProvider: true });
  const onPageReady = context?.onPageReady;

  const onInitialRenderComplete = useCallback(() => {
    if (isInitialRenderComplete) {
      return;
    }
    isInitialRenderComplete = true;
    onPageReady?.();
  }, [onPageReady]);

  useEffect(() => {
    if (isReady) {
      onInitialRenderComplete();
    }
  }, [isReady, onInitialRenderComplete]);

  return onInitialRenderComplete;
};

export const resetPageRenderCompleteReport = () => {
  isInitialRenderComplete = false;
};
