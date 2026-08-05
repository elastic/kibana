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
import type { MetricsGridSettings } from '@kbn/discover-utils';
import type { ValuesType } from 'utility-types';
import type { ExternalServices } from './context/external_services';
import type { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from './common/constants';

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
   * The profile ID of the data source profile that renders this grid.
   * Used for execution context labels in APM monitoring.
   */
  profileId: string;
  /**
   * Breakdown field from Discover's app state, synced from sidebar "Add Breakdown" action
   */
  breakdownField?: string;
  /**
   * Optional callback used to push toolbar breakdown selections back to Discover app state.
   */
  onBreakdownFieldChange?: (fieldName?: string) => void;
  /**
   * Optional external services injected by the host (e.g. Discover) to enable
   * cross-plugin features such as the Streams flyout field section and ErrorCallout.
   */
  externalServices?: ExternalServices;
  /**
   * Current per-`metric_type` aggregation overrides (counter/gauge/histogram).
   * Falls back to `METRICS_GRID_SETTINGS_DEFAULTS` when not provided by the host.
   */
  gridSettings?: MetricsGridSettings;
  /**
   * Optional callback used to push grid setting changes back to the host
   * (e.g. Discover's persistent profile state).
   */
  onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
  /**
   * Current grid sort selection, sourced from the host (e.g. Discover's
   * persistent profile state). Falls back to `DEFAULT_METRICS_SORT` when not
   * provided.
   */
  metricsSort?: MetricsSort;
  /**
   * Callback used to push sort changes back to the host (e.g. Discover's
   * persistent profile state, which is restored on page reload).
   */
  onMetricsSortChange?: (sort: MetricsSort) => void;
  /**
   * Loads the list of recently explored metrics, falls back to A->Z.
   */
  getRecentlyExploredMetrics?: () => readonly string[];
  /**
   * Records a metric as recently explored (host persists it), keyed by `getMetricUniqueKey`.
   * Called when the user interacts with a metric chart. Recorded on click action, hover is ignored.
   */
  onMetricExplored?: (metricUniqueKey: string) => void;
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

export type TelemetryUnitKey = MetricUnit | 'none';
export type NullableMetricUnit = MetricUnit | null;

export interface MetricsESQLResponse {
  metric_name: string;
  index_name: string[] | string;
  unit: MetricUnit[] | null;
  metric_type: MappingTimeSeriesMetricType[] | MappingTimeSeriesMetricType;
  field_type: ES_FIELD_TYPES[] | ES_FIELD_TYPES;
  dimension_fields: string[] | string;
}

export interface ParsedMetricItem {
  metricName: string;
  indexName: string;
  readonly units: NullableMetricUnit[];
  readonly metricTypes: MappingTimeSeriesMetricType[];
  readonly fieldTypes: ES_FIELD_TYPES[];
  readonly dimensionFields: Dimension[];
}

export interface MetricsTelemetry {
  total_number_of_metrics: number;
  total_number_of_dimensions: number;
  metrics_by_type: Partial<Record<MappingTimeSeriesMetricType, number>>;
  units: Partial<Record<TelemetryUnitKey, number>>;
  multi_value_counts: {
    index_names: number;
    field_types: number;
    metric_types: number;
    units: number;
  };
}

export interface ParsedMetrics {
  metricItems: ParsedMetricItem[];
  allDimensions: Dimension[];
}

export interface MetricsInfo extends ParsedMetrics {
  loading: boolean;
  error: Error | null;
  activeDimensions: Dimension[];
}

export interface ParsedMetricsWithTelemetry extends ParsedMetrics {
  telemetry: MetricsTelemetry;
}

export interface Metric {
  readonly indexNames: string[];
  readonly units: NullableMetricUnit[];
  readonly metricTypes: MappingTimeSeriesMetricType[];
  readonly fieldTypes: ES_FIELD_TYPES[];
}

export type MetricsSortBy = ValuesType<typeof METRICS_SORT_BY>;
export type MetricsSortDirection = ValuesType<typeof METRICS_SORT_DIRECTION>;
export type MetricsSort = readonly [MetricsSortBy, MetricsSortDirection];
