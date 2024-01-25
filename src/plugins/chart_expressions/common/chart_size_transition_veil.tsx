/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { useCallback, useRef, useState } from 'react';
import fastIsEqual from 'fast-deep-equal';
import { useResizeObserver } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { ChartSizeSpec } from './types';

/**
 * This hook is used to show a veil over the chart while it is being resized
 * in response to a change in the container dimensions.
 *
 * It is only relevant if client dimensions are being requested based on chart configuration.
 *
 * This whole feature is a nice-to-have. If it proves to be a source of bugs,
 * we can consider removing it and accepting the aesthetic drawback.
 */
export function useSizeTransitionVeil(
  chartSizeSpec: ChartSizeSpec,
  setChartSize: (d: ChartSizeSpec) => void,
  // should be retrieved from handlers.shouldUseSizeTransitionVeil function
  shouldUseVeil: boolean
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useResizeObserver(containerRef.current);
  const currentContainerSize = useRef<{ width: number; height: number }>(containerSize);

  // This useEffect hook is here to make up for the fact that the initial container size
  // is not correctly reported by the useResizeObserver hook (see https://github.com/elastic/eui/issues/7458).
  useEffect(() => {
    currentContainerSize.current = {
      width: containerRef.current?.clientWidth ?? 0,
      height: containerRef.current?.clientHeight ?? 0,
    };
  }, []);

  const [showVeil, setShowVeil] = useState(false);
  const currentChartSizeSpec = useRef<ChartSizeSpec>();
  const specJustChanged = useRef<boolean>(false);

  useEffect(() => {
    if (!fastIsEqual(containerSize, currentContainerSize.current) && specJustChanged.current) {
      // If the container size has changed, we need to show the veil to hide the chart since it
      // be rendered based on the previous container size before being updated to the current size.
      //
      // 1. we show the veil
      // 2. the charts library will render the chart based on the previous container dimensions
      // 3. the charts library will resize the chart to the updated container dimensions
      // 4. we hide the veil
      setShowVeil(true);
      currentContainerSize.current = containerSize;
    }
  }, [setShowVeil, containerSize]);

  useEffect(() => {
    if (!fastIsEqual(chartSizeSpec, currentChartSizeSpec.current)) {
      setChartSize(chartSizeSpec);
      currentChartSizeSpec.current = chartSizeSpec;
      specJustChanged.current = true;

      setTimeout(() => {
        specJustChanged.current = false;
      }, 500);
    }
  }, [chartSizeSpec, setChartSize]);

  const onResize = useCallback(() => {
    setShowVeil(false);
  }, []);

  return {
    veil: (
      <div
        css={{
          height: '100%',
          width: '100%',
          backgroundColor: euiThemeVars.euiColorEmptyShade,
          position: 'absolute',
          zIndex: 1,
          display: shouldUseVeil && showVeil ? 'block' : 'none',
        }}
      />
    ),
    onResize,
    containerRef,
  };
}
