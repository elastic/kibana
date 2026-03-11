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
  /**
   * Parsed METRICS_INFO result from Discover. When provided, used as the single source for metricFields and dimensions.
   */
  metricsInfo?: ParsedMetricsInfo | null;
}

export interface Dimension {
  name: string;
}

export interface MetricField {
  name: string;
  dataStreams: string[];
  metricTypes: MappingTimeSeriesMetricType[];
  fieldtypes: ES_FIELD_TYPES[];
  units: (MetricUnit | null)[];
  dimensions: string[];
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

/**
 * Parsed result of METRICS_INFO ES|QL command.
 * Used as the single source for metricFields and dimensions in the metrics experience.
 */
export interface ParsedMetricsInfo {
  metricFields: MetricField[];
  allDimensionFields: string[];
}
