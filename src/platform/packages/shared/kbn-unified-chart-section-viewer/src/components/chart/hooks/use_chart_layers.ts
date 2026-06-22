/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { Dimension, NullableMetricUnit } from '../../../types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  getLensMetricFormat,
  firstNonNullable,
  resolveMetricUnit,
} from '../../../common/utils';

/**
 * Narrow input describing only the metric fields that `useChartLayers` actually reads.
 * Decouples the hook from the wider `ParsedMetricItem` domain type so non-metrics-explorer
 * call sites (e.g. trace charts) do not need to fabricate unrelated fields.
 */
interface ChartLayerMetricInput {
  metricName: string;
  readonly metricTypes: MappingTimeSeriesMetricType[];
  readonly units: NullableMetricUnit[];
  readonly fieldTypes: ES_FIELD_TYPES[];
}

interface UseChartLayersParams {
  dimensions?: Dimension[];
  metricItem: ChartLayerMetricInput;
  color?: string;
  seriesType?: LensSeriesLayer['seriesType'];
  customFunction?: string;
}

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
    const fieldTypes = metricItem.fieldTypes;
    const instrument = firstNonNullable(metricItem.metricTypes);
    const resolvedUnit = resolveMetricUnit(metricItem.metricName, metricItem.units);

    if (fieldTypes.length === 0 || !instrument) {
      return [];
    }

    const metricField = createMetricAggregation({
      types: fieldTypes,
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
