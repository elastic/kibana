/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MetricsESQLResponseObject,
  ParsedMetricItem,
  ParsedMetricsResult,
} from '../../../../types';
import { toArray } from './to_array';

export const parseMetricsResponse = (
  response: MetricsESQLResponseObject[]
): ParsedMetricsResult => {
  const result: ParsedMetricItem[] = [];
  const allDimensionsSet = new Set<string>();

  for (const metric of response) {
    const dataStreams = toArray(metric.data_stream);
    const units = toArray(metric.unit);
    const metricTypes = toArray(metric.metric_type);
    const fieldTypes = toArray(metric.field_type);
    const dimensionFields = toArray(metric.dimension_fields);

    dimensionFields.forEach((d) => allDimensionsSet.add(d));

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
    allDimensions: Array.from(allDimensionsSet),
  };
};
