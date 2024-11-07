/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { ChartSizeSpec } from '@kbn/chart-expressions-common';
import { GaugeShape, GaugeShapes } from '../../../common';

export const useGaugeSizeByType = (type: GaugeShape, setChartSize: (d: ChartSizeSpec) => void) => {
  useEffect(() => {
    const maxDimensions: Record<GaugeShape, ChartSizeSpec> = {
      [GaugeShapes.SEMI_CIRCLE]: {
        maxDimensions: {
          x: { value: 600, unit: 'pixels' },
          y: { value: 600, unit: 'pixels' },
        },
        aspectRatio: {
          x: 2,
          y: 1.25,
        },
      },
      [GaugeShapes.ARC]: {
        maxDimensions: {
          x: { value: 600, unit: 'pixels' },
          y: { value: 600, unit: 'pixels' },
        },
        aspectRatio: {
          x: 1.1,
          y: 1,
        },
      },
      [GaugeShapes.CIRCLE]: {
        maxDimensions: {
          x: { value: 600, unit: 'pixels' },
          y: { value: 600, unit: 'pixels' },
        },
        aspectRatio: {
          x: 1,
          y: 1,
        },
      },
      [GaugeShapes.HORIZONTAL_BULLET]: {
        maxDimensions: {
          x: { value: 600, unit: 'pixels' },
          y: { value: 200, unit: 'pixels' },
        },
      },
      [GaugeShapes.VERTICAL_BULLET]: {
        maxDimensions: {
          x: { value: 400, unit: 'pixels' },
          y: { value: 600, unit: 'pixels' },
        },
      },
    };

    setChartSize(maxDimensions[type]);
  }, [type, setChartSize]);
};
