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
import type { Dimension, MetricUnit, ParsedMetricItem } from '../../../types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  getLensMetricFormat,
  firstNonNullable,
} from '../../../common/utils';
import { normalizeUnit } from '../../../common/utils/metric_unit/normalize_unit';

interface UseChartLayersParams {
  dimensions?: Dimension[];
  metricItem: ParsedMetricItem;
  color?: string;
  seriesType?: LensSeriesLayer['seriesType'];
  customFunction?: string;
}

/**
 * Resolves the unit for a metric by normalizing and selecting the best option.
 * Normalizes raw units (e.g., 'byte' -> 'bytes') and handles multiple units.
 */
const resolveMetricUnit = (
  metricName: string,
  units: (string | null | undefined)[]
): MetricUnit | undefined => {
  // Filter out null/undefined values and normalize each unit
  const normalizedUnits = units
    .filter((u) => u != null)
    .map((unit) => normalizeUnit({ fieldName: metricName, unit: unit as string }))
    .filter((u) => u != null);

  // Return the first normalized unit, or undefined if none exist
  return normalizedUnits[0];
};

/**
 * A hook that computes the Lens series layer configuration for the metrics chart.
 * Properly normalizes metric units to ensure they are displayed correctly in the chart
 * (e.g., 'byte' -> 'bytes', handling multiple units over time).
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
    const resolvedUnit = resolveMetricUnit(metricItem.metricName, metricItem.units);

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
