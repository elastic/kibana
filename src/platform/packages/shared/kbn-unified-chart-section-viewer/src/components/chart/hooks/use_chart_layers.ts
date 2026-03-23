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
import type { Dimension, ParsedMetricItem } from '../../../types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  getLensMetricFormat,
  firstNonNullable,
} from '../../../common/utils';

interface UseChartLayersParams {
  dimensions?: Dimension[];
  metricItem: ParsedMetricItem;
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
  metricItem,
  color,
  seriesType,
  customFunction,
}: UseChartLayersParams): LensSeriesLayer[] => {
  return useMemo((): LensSeriesLayer[] => {
    const type = firstNonNullable(metricItem.fieldTypes);
    const instrument = firstNonNullable(metricItem.metricTypes);
    const resolvedUnit = firstNonNullable(metricItem.units);

    if (!type || !instrument) {
      return [];
    }

    const metricField = createMetricAggregation({
      type,
      instrument,
      metricName: metricItem.metricName,
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
            ...(resolvedUnit ? getLensMetricFormat(resolvedUnit) : {}),
          },
        ],
        breakdown: hasDimensions ? dimensions.map((dim) => dim.name) : undefined,
      },
    ];
  }, [
    color,
    customFunction,
    dimensions,
    metricItem.fieldTypes,
    metricItem.metricTypes,
    metricItem.metricName,
    metricItem.units,
    seriesType,
  ]);
};
