/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useCallback, useRef, useState } from 'react';
import fastIsEqual from 'fast-deep-equal';
import type { ChartDimensionOptions } from './types';

/**
 * This hook is used to show a veil over the chart while it is being resized
 * in response to a change in the container dimensions.
 *
 * It is only relevant if client dimensions are being requested based on chart configuration.
 */
export function useDimensionTransitionVeil(
  dimensions: ChartDimensionOptions,
  setDimensions: (d: ChartDimensionOptions) => void
) {
  const [showVeil, setShowVeil] = useState(false);
  const currentDimensions = useRef<ChartDimensionOptions>();

  if (!fastIsEqual(dimensions, currentDimensions.current)) {
    // If the dimensions have changed we request new dimensions from the client
    // and set off a chain of events:
    //
    // 1. we show the veil to hide step 4
    // 2. the charts library will plan a render
    // 3. the client will resize the container
    // 4. the charts library will render the chart based on the original container dimensions
    // 5. the charts library will resize the chart to the updated container dimensions
    // 6. we hide the veil

    setDimensions(dimensions);
    setShowVeil(true);
    currentDimensions.current = dimensions;
  }

  const onResize = useCallback(() => {
    setShowVeil(false);
  }, []);

  return {
    veil: (
      <div
        css={{
          height: '100%',
          width: '100%',
          backgroundColor: 'white',
          position: 'absolute',
          zIndex: 1,
          display: showVeil ? 'block' : 'none',
        }}
      />
    ),
    onResize,
  };
}
