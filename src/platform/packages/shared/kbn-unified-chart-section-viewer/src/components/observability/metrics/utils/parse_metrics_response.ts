/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Dimension,
  MetricsESQLResponse,
  MetricsTelemetry,
  ParsedMetricItem,
  ParsedMetricsResult,
} from '../../../../types';

/** Full parse output including aggregated METRICS_INFO telemetry (for callbacks, not part of {@link ParsedMetricsResult}). */
export type ParseMetricsResponseResult = ParsedMetricsResult & {
  telemetry: MetricsTelemetry;
};

import { toArray } from './to_array';
import { ALLOWED_METRIC_TYPES } from '../../../../common/constants';
import { accumulateMetricsRowTelemetry } from './accumulate_metrics_row_telemetry';

const ALLOWED_METRIC_TYPES_SET = new Set(ALLOWED_METRIC_TYPES);

export const createInitialMetricsTelemetry = (): MetricsTelemetry => ({
  total_number_of_metrics: 0,
  total_number_of_dimensions: 0,
  metrics_by_type: {},
  units: {},
  multi_value_counts: { data_streams: 0, field_types: 0, metric_types: 0 },
});

export const parseMetricsResponse = (
  response: MetricsESQLResponse[],
  getFieldType?: (name: string) => string | undefined
): ParsedMetricsResult => {
  const result: ParsedMetricItem[] = [];
  const telemetry = createInitialMetricsTelemetry();

  const allDimensionsSet = new Set<string>();

  const toDimension = (name: string): Dimension => {
    const type = getFieldType?.(name);
    return { name, type };
  };

  for (const metric of response) {
    const metricTypes = toArray(metric.metric_type);
    const dataStreams = toArray(metric.data_stream);
    const units = toArray(metric.unit);
    const fieldTypes = toArray(metric.field_type);
    const dimensions = toArray(metric.dimension_fields);

    accumulateMetricsRowTelemetry(telemetry, {
      metricTypes,
      dataStreams,
      units,
      fieldTypes,
    });

    const isSupportedMetricType = metricTypes.every((metricType) =>
      ALLOWED_METRIC_TYPES_SET.has(metricType)
    );

    if (!isSupportedMetricType) {
      continue;
    }

    const dimensionFields = dimensions.map((name) => {
      allDimensionsSet.add(name);
      return toDimension(name);
    });

    for (const stream of dataStreams) {
      result.push({
        metricName: metric.metric_name,
        dataStream: stream,
        units,
        metricTypes,
        fieldTypes,
        dimensionFields,
      });
    }
  }

  telemetry.total_number_of_dimensions = allDimensionsSet.size;
  telemetry.total_number_of_metrics = result.length;

  return {
    metricItems: result,
    allDimensions: Array.from(allDimensionsSet).map(toDimension),
  };
};
