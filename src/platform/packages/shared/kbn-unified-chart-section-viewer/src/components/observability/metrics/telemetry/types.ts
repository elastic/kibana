/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HistogramPercentile, SimpleAggregation } from '@kbn/discover-utils';
import type { ChartSectionErrorCategory } from '../../../../common/errors/classify_chart_section_error';

export type MetricAggregationConfigMetricType = 'counter' | 'gauge' | 'histogram';

/** ES|QL source command of the query that failed, or `unknown` when it cannot be parsed. */
export type MetricsEsqlQueryType = 'TS' | 'FROM' | 'unknown';

export interface MetricsEsqlQueryFailureEvent {
  error_type?: string;
  error_category: ChartSectionErrorCategory;
  status_code?: number;
  query_type: MetricsEsqlQueryType;
  profile: string;
}

export interface MetricAggregationConfigChangedEvent {
  metric_type: MetricAggregationConfigMetricType;
  previous_aggregation: SimpleAggregation | HistogramPercentile;
  new_aggregation: SimpleAggregation | HistogramPercentile;
}
