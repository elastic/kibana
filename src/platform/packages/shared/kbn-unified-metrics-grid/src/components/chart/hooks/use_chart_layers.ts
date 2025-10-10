/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils/config_builder';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  DIMENSIONS_COLUMN,
  getLensMetricFormat,
} from '../../../common/utils';

interface UseChartLayersParams {
  dimensions: string[];
  metric: MetricField;
  color?: string;
}

/**
 * A hook that computes the Lens series layer configuration for the metrics chart.
 *
 * @param dimensions - An array of dimension fields to break down the series by.
 * @param metric - The metric field to be visualized.
 * @param color - The color to apply to the series.
 * @returns An array of LensSeriesLayer configurations.
 */
export const useChartLayers = ({
  dimensions,
  metric,
  color,
}: UseChartLayersParams): LensSeriesLayer[] => {
  return useMemo((): LensSeriesLayer[] => {
    const metricField = createMetricAggregation({
      instrument: metric.instrument,
      metricName: metric.name,
    });
    
    // Determine the breakdown field based on dimension count
    const getBreakdownField = () => {
      if (dimensions.length === 0) return undefined;
      if (dimensions.length === 1) return dimensions[0];
      return DIMENSIONS_COLUMN;
    };

    return [
      {
        type: 'series',
        seriesType: dimensions.length > 0 ? 'line' : 'area',
        xAxis: {
          field: createTimeBucketAggregation({}),
          type: 'dateHistogram',
        },
        yAxis: [
          {
            value: metricField,
            label: metricField,
            compactValues: true,
            seriesColor: color,
            ...(metric.unit ? getLensMetricFormat(metric.unit) : {}),
          },
        ],
        breakdown: getBreakdownField(),
      },
    ];
  }, [dimensions, metric, color]);
};
