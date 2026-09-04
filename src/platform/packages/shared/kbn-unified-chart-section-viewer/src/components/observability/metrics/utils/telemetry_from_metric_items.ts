/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsTelemetry, ParsedMetricItem } from '../../../../types';
import { accumulateMetricsRowTelemetry } from '../telemetry';

const createEmptyTelemetry = (): MetricsTelemetry => ({
  total_number_of_metrics: 0,
  total_number_of_dimensions: 0,
  metrics_by_type: {},
  units: {},
  multi_value_counts: { index_names: 0, field_types: 0, metric_types: 0, units: 0 },
});

/**
 * Builds listing telemetry from the cards the grid actually shows.
 */
export function telemetryFromMetricItems(
  metricItems: readonly ParsedMetricItem[]
): MetricsTelemetry {
  const telemetry = createEmptyTelemetry();
  const dimensions = new Set<string>();

  for (const item of metricItems) {
    accumulateMetricsRowTelemetry(telemetry, {
      metricTypes: item.metricTypes,
      indexNames: [item.indexName],
      units: item.units,
      fieldTypes: item.fieldTypes,
    });
    for (const dimension of item.dimensionFields) {
      dimensions.add(dimension.name);
    }
  }

  telemetry.total_number_of_metrics = metricItems.length;
  telemetry.total_number_of_dimensions = dimensions.size;
  return telemetry;
}
