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
  ParsedMetricItem,
  ParsedMetricsResult,
} from '../../../../types';
import { toArray } from './to_array';
import { ALLOWED_METRIC_TYPES } from '../../../../common/constants';

const ALLOWED_METRIC_TYPES_SET = new Set(ALLOWED_METRIC_TYPES);

/**
 * Dimension names that are internal metadata and should not be exposed to users.
 * See: https://github.com/elastic/observability-dev/issues/5412
 */
const INTERNAL_DIMENSION_EXACT_NAMES = new Set(['_metric_names_hash', 'unit']);

/**
 * Dimension name prefixes that indicate internal metadata fields.
 * Any dimension whose name starts with one of these prefixes will be hidden.
 */
const INTERNAL_DIMENSION_PREFIXES = ['labels._'];

const isInternalDimension = (name: string): boolean => {
  if (INTERNAL_DIMENSION_EXACT_NAMES.has(name)) {
    return true;
  }
  return INTERNAL_DIMENSION_PREFIXES.some((prefix) => name.startsWith(prefix));
};

export const parseMetricsResponse = (
  response: MetricsESQLResponse[],
  getFieldType?: (name: string) => string | undefined
): ParsedMetricsResult => {
  const result: ParsedMetricItem[] = [];
  const allDimensionsSet = new Set<string>();

  const toDimension = (name: string): Dimension => {
    const type = getFieldType?.(name);
    return { name, type };
  };

  for (const metric of response) {
    const metricTypes = toArray(metric.metric_type);

    const isSupportedMetricType = metricTypes.every((metricType) =>
      ALLOWED_METRIC_TYPES_SET.has(metricType)
    );

    if (!isSupportedMetricType) {
      continue;
    }

    const dataStreams = toArray(metric.data_stream);
    const units = toArray(metric.unit);
    const fieldTypes = toArray(metric.field_type);
    const dimensions = toArray(metric.dimension_fields).filter(
      (name) => !isInternalDimension(name)
    );

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

  return {
    metricItems: result,
    allDimensions: Array.from(allDimensionsSet).map(toDimension),
  };
};
