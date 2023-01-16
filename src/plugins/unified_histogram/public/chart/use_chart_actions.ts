/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UnifiedHistogramChartContext } from '../types';

export const useChartActions = ({
  chart,
  onChartHiddenChange,
}: {
  chart: UnifiedHistogramChartContext | undefined;
  onChartHiddenChange?: (chartHidden: boolean) => void;
}) => {
  const [showChartOptionsPopover, setShowChartOptionsPopover] = useState(false);

  const toggleChartOptions = useCallback(() => {
    setShowChartOptionsPopover(!showChartOptionsPopover);
  }, [showChartOptionsPopover]);

  const closeChartOptions = useCallback(() => {
    setShowChartOptionsPopover(false);
  }, [setShowChartOptionsPopover]);

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
    showChartOptionsPopover,
    chartRef,
    toggleChartOptions,
    closeChartOptions,
    toggleHideChart,
  };
};
