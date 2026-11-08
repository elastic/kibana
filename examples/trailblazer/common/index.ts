/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'trailblazer';
export const PLUGIN_NAME = 'Trailblazer';

export const API_BASE = '/internal/trailblazer';
export const INDICES_ROUTE = `${API_BASE}/indices`;
export const FIELDS_ROUTE = `${API_BASE}/fields`;
export const SEARCH_ROUTE = `${API_BASE}/search`;
export const FIELD_STATS_ROUTE = `${API_BASE}/field_stats`;
export const SAVED_OBJECT_TYPES_ROUTE = `${API_BASE}/saved_object_types`;
export const SAVED_OBJECTS_ROUTE = `${API_BASE}/saved_objects`;
export const SAVED_OBJECT_ROUTE = `${API_BASE}/saved_object`;

export const EVENT_LOG_INDEX_PATTERN = '.kibana-event-log*';
export const ALERTS_INDEX_PATTERN = '.alerts-*';

export const QUERY_LANGUAGES = ['kql', 'lucene', 'dsl'] as const;
export type QueryLanguage = (typeof QUERY_LANGUAGES)[number];

export const MAX_SEARCH_SIZE = 500;
export const MAX_QUERY_LENGTH = 10_000;
export const MAX_NAME_LENGTH = 1_000;

export type IndexKind = 'index' | 'alias' | 'data_stream';

export interface IndexSummary {
  readonly name: string;
  readonly kind: IndexKind;
  readonly docsCount?: number;
  readonly storeSizeBytes?: number;
  readonly health?: string;
  /** Indices an alias points to, or the backing indices of a data stream. */
  readonly targets?: readonly string[];
}

export interface IndicesResponse {
  readonly indices: readonly IndexSummary[];
}

export interface FieldSummary {
  readonly name: string;
  readonly type: string;
  readonly aggregatable: boolean;
  readonly searchable: boolean;
  readonly conflictingTypes?: readonly string[];
}

export interface FieldsResponse {
  readonly fields: readonly FieldSummary[];
  readonly timeField?: string;
}

export interface SearchRequestBody {
  readonly index: string;
  readonly includeHidden?: boolean;
  readonly language: QueryLanguage;
  readonly query: string;
  readonly size: number;
  readonly from: number;
  readonly sortField?: string;
}

export interface SearchHit {
  readonly index: string;
  readonly id: string;
  readonly source: Record<string, unknown>;
}

export interface SearchResponseBody {
  readonly total: number;
  readonly took: number;
  readonly hits: readonly SearchHit[];
}

export interface FieldStatsRequestBody {
  readonly index: string;
  readonly includeHidden?: boolean;
  readonly language: QueryLanguage;
  readonly query: string;
  readonly field: string;
  readonly fieldType: string;
}

export type FieldStatsKind = 'date' | 'histogram' | 'terms';

export interface FieldStatsBucket {
  readonly key: string | number;
  readonly label: string;
  readonly count: number;
  /** Exclusive upper bound for range buckets (date and histogram). */
  readonly to?: string | number;
}

export interface FieldStatsResponse {
  readonly kind: FieldStatsKind;
  readonly totalDocs: number;
  readonly missingDocs: number;
  readonly buckets: readonly FieldStatsBucket[];
}

export const NUMERIC_FIELD_TYPES: readonly string[] = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
];

export const DATE_FIELD_TYPES: readonly string[] = ['date', 'date_nanos'];
