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
}

export interface Dimension {
  name: string;
  type: ES_FIELD_TYPES;
}

export interface MetricField {
  name: string;
  index: string;
  type: ES_FIELD_TYPES;
  instrument?: MappingTimeSeriesMetricType;
  unit?: MetricUnit;
  dimensions: Dimension[];
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
