/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { Dimension } from '../dimensions/types';

export type MetricFieldType = 'metric' | 'dimension';
export interface MetricField {
  name: string;
  index: string;
  dimensions: Dimension[];
  type: string;
  instrument?: MappingTimeSeriesMetricType;
  unit?: MetricUnit;
  display?: string;
  noData?: boolean;
}

export interface MetricFieldsResponse {
  fields: MetricField[];
  total: number;
  error?: string;
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
