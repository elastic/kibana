/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** The table of an ES|QL response: column names and row values. */
export interface EsqlTable {
  columns: Array<{ name: string; type?: string }>;
  values: unknown[][];
}

/** Runs an ES|QL query. Hosts decide how: search strategy, API route, test double. */
export type RunEsql = (query: string, options?: { signal?: AbortSignal }) => Promise<EsqlTable>;

/** The traces the map reads. */
export interface TraceSource {
  /** Comma-separated index patterns. Classic APM, legacy APM and OTel traces when absent. */
  indexPattern?: string;
  /** Absolute ISO timestamps. */
  timeRange: { from: string; to: string };
  /** ES|QL boolean expressions over raw fields, applied to every span. */
  filters?: string[];
}

/** Whether the map counts every span, or traces, each at its root span. */
export type LatencyMapUnit = 'spans' | 'traces';

/** Duration statistics of a time range, in microseconds. */
export interface DurationStats {
  min: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  spans: number;
}

/**
 * A region of the map: a time window and a duration range, in microseconds. Always a
 * whole number of cells once committed, so what is highlighted is what the condition
 * selects.
 */
export interface LatencyMapSelection {
  /** Inclusive, ISO. */
  from: string;
  /** Exclusive, ISO. */
  to: string;
  /** Inclusive. */
  minDurationUs: number;
  /** Exclusive. */
  maxDurationUs: number;
  /** Only the failed spans of the region. */
  failedOnly?: boolean;
}

/** A cell of the map with its counts. */
export interface LatencyMapCell extends LatencyMapSelection {
  spans: number;
  failed: number;
}
