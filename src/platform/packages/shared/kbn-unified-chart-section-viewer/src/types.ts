/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
interface ChartSectionActions {
  openInNewTab?: (params: {
    query?: Query | AggregateQuery;
    tabLabel?: string;
    timeRange?: TimeRange;
  }) => void;
  updateESQLQuery?: (queryOrUpdater: string | ((prevQuery: string) => string)) => void;
}

export interface UnifiedMetricsGridProps extends ChartSectionProps {
  actions: ChartSectionActions;
  /**
   * Breakdown field from Discover's app state, synced from sidebar "Add Breakdown" action
   */
  breakdownField?: string;
  /**
   * Optional callback used to push toolbar breakdown selections back to Discover app state.
   */
  onBreakdownFieldChange?: (fieldName?: string) => void;
}

export interface Dimension {
  name: string;
  type?: string;
}

export type MetricUnit =
  | 'ns'
  | 'us'
  | 'ms'
  | 's'
  | 'm'
  | 'h'
  | 'd'
  | 'percent'
  | 'bytes'
  | 'count'
  | `{${string}}`; // otel special units of count

export interface MetricsESQLResponse {
  metric_name: string;
  data_stream: string[] | string;
  unit: MetricUnit[] | null;
  metric_type: MappingTimeSeriesMetricType[] | MappingTimeSeriesMetricType;
  field_type: ES_FIELD_TYPES[] | ES_FIELD_TYPES;
  dimension_fields: string[] | string;
}

export interface ParsedMetricItem {
  metricName: string;
  dataStream: string;
  readonly units: MetricUnit[];
  readonly metricTypes: MappingTimeSeriesMetricType[];
  readonly fieldTypes: ES_FIELD_TYPES[];
  readonly dimensionFields: Dimension[];
}

export interface ParsedMetricsResult {
  metricItems: ParsedMetricItem[];
  allDimensions: Dimension[];
}

export interface MetricsInfoResponse {
  loading: boolean;
  error: Error | null;
  metricItems: ParsedMetricItem[];
  allDimensions: Dimension[];
}
