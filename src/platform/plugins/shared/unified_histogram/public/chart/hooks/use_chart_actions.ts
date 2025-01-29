/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { UnifiedHistogramChartContext } from '../../types';

export const useChartActions = ({
  chart,
  onChartHiddenChange,
}: {
  chart: UnifiedHistogramChartContext | undefined;
  onChartHiddenChange?: (chartHidden: boolean) => void;
}) => {
  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  useEffect(() => {
    if (chartRef.current.moveFocus && chartRef.current.element) {
      chartRef.current.element.focus();
    }
  }, [chart?.hidden]);

  const toggleHideChart = useCallback(() => {
    const chartHidden = !chart?.hidden;
    chartRef.current.moveFocus = !chartHidden;
    onChartHiddenChange?.(chartHidden);
  }, [chart?.hidden, onChartHiddenChange]);

  return {
    chartRef,
    toggleHideChart,
  };
};
