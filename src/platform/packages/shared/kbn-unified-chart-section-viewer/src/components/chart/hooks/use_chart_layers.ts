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
import type { Dimension, MetricField } from '../../../types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  getLensMetricFormat,
} from '../../../common/utils';

interface UseChartLayersParams {
  dimensions?: Dimension[];
  metric: MetricField;
  color?: string;
  seriesType?: LensSeriesLayer['seriesType'];
  customFunction?: string;
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
  dimensions = [],
  metric,
  color,
  seriesType,
  customFunction,
}: UseChartLayersParams): LensSeriesLayer[] => {
  return useMemo((): LensSeriesLayer[] => {
    const metricField = createMetricAggregation({
      type: metric.type,
      instrument: metric.instrument,
      metricName: metric.name,
      customFunction,
    });
    const hasDimensions = dimensions.length > 0;

    return [
      {
        type: 'series',
        seriesType: seriesType || hasDimensions ? 'line' : 'area',
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
        breakdown: hasDimensions ? dimensions[0].name : undefined,
      },
    ];
  }, [
    color,
    customFunction,
    dimensions,
    metric.type,
    metric.instrument,
    metric.name,
    metric.unit,
    seriesType,
  ]);
};
