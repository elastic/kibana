/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { MetricsTelemetry, MetricUnit } from '../../../../types';

interface Metric {
  readonly dataStreams: string[];
  readonly units: MetricUnit[];
  readonly metricTypes: MappingTimeSeriesMetricType[];
  readonly fieldTypes: ES_FIELD_TYPES[];
}

/**
 * Updates the telemetry object based on a single metric row's data.
 */
export const accumulateMetricsRowTelemetry = (telemetry: MetricsTelemetry, metric: Metric) => {
  const { metricTypes, dataStreams, units, fieldTypes } = metric;

  telemetry.multi_value_counts.data_streams += +(dataStreams.length > 1);
  telemetry.multi_value_counts.field_types += +(fieldTypes.length > 1);
  telemetry.multi_value_counts.metric_types += +(metricTypes.length > 1);

  for (const type of metricTypes) {
    telemetry.metrics_by_type[type] = (telemetry.metrics_by_type[type] || 0) + 1;
  }

  for (const unit of units) {
    telemetry.units[unit] = (telemetry.units[unit] || 0) + 1;
  }
};
