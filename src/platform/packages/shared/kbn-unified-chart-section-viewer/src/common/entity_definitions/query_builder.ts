/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, synth, mutate, BasicPrettyPrinter } from '@kbn/esql-language';
import type { CuratedMetricQuery } from './types';

/**
 * Options for building queries
 */
export interface BuildQueryOptions {
  /** The index pattern to query */
  index: string;
  /** The entity field to group by */
  entityField: string;
  /** Whether to build a trend query with time bucketing */
  trend?: boolean;
  /** Time bucket interval for trend queries (e.g., '1m', '5m', '1h') */
  interval?: string;
}

/**
 * Get the result column name from a metric field.
 * Uses the last segment of the field name.
 *
 * @example
 * getResultColumn('system.cpu.utilization') → 'utilization'
 * getResultColumn('system.network.io') → 'io'
 */
export const getResultColumn = (field: string): string => {
  const parts = field.split('.');
  return parts[parts.length - 1];
};

/**
 * Build an ES|QL query for a curated metric.
 *
 * Supports two modes:
 * 1. Simple metrics (field + instrument) → auto-generates query
 * 2. Custom metrics (query template) → renders template with placeholders
 */
export const buildQuery = (metric: CuratedMetricQuery, options: BuildQueryOptions): string => {
  if (metric.query) {
    return renderTemplate(metric, options);
  }
  return buildSimpleQuery(metric, options);
};

/**
 * Render a custom query template with placeholders.
 *
 * Placeholders:
 * - {{index}} → index pattern
 * - {{entity}} → entity field
 * - {{bucket}} → ', BUCKET(@timestamp, interval)' for trends, '' for summary
 * - {{timestamp}} → ', @timestamp' for trends, '' for summary
 * - {{sort}} → '@timestamp ASC' for trends, 'column DESC' for summary
 */
const renderTemplate = (metric: CuratedMetricQuery, options: BuildQueryOptions): string => {
  const { index, entityField, trend, interval } = options;

  // Determine result column for sort (find first column assignment in template)
  const colMatch = metric.query?.match(/(\w+)\s*=/);
  const resultCol = colMatch?.[1] ?? 'value';

  let query = metric.query ?? '';

  query = query
    .replace(/\{\{index\}\}/g, index)
    .replace(/\{\{entity\}\}/g, entityField)
    .replace(/\{\{bucket\}\}/g, trend && interval ? `, BUCKET(@timestamp, ${interval})` : '')
    .replace(/\{\{timestamp\}\}/g, trend ? ', @timestamp' : '')
    .replace(/\{\{sort\}\}/g, trend ? '@timestamp ASC' : `${resultCol} DESC`);

  return prettyPrint(query);
};

/**
 * Build a simple query based on field + instrument type.
 *
 * Aggregation strategy:
 * - gauge: AVG(field) BY entity
 * - counter: SUM(RATE(field)) BY entity, bucket → AVG per entity
 */
const buildSimpleQuery = (metric: CuratedMetricQuery, options: BuildQueryOptions): string => {
  const { index, entityField, trend, interval } = options;
  const col = esql.col(metric.field ?? '');
  const entity = esql.col(entityField);
  const sortField = metric.field ?? '';

  if (metric.instrument === 'counter') {
    if (trend && interval) {
      // Counter trend: rate per bucket
      return esql`TS ${index}`
        .pipe`STATS ${col} = SUM(RATE(${col})) BY ${entity}, BUCKET(@timestamp, ${interval})`
        .sort(['@timestamp', 'ASC'])
        .print('wrapping');
    }
    // Counter summary: two-stage aggregation
    return esql`TS ${index}`
      .pipe`STATS _rate = SUM(RATE(${col})) BY ${entity}, BUCKET(@timestamp, 100, ?_tstart, ?_tend)`
      .pipe`STATS ${col} = AVG(_rate) BY ${entity}`
      .sort([sortField, 'DESC'])
      .print('wrapping');
  }

  // Gauge
  if (trend && interval) {
    return esql`TS ${index}`
      .pipe`STATS ${col} = AVG(${col}) BY ${entity}, BUCKET(@timestamp, ${interval})`
      .sort(['@timestamp', 'ASC'])
      .print('wrapping');
  }
  // Gauge summary
  const query = esql`TS ${index}`.pipe`STATS ${col} = AVG(${col}) BY ${entity}`;
  return query.sort([sortField, 'DESC']).print('wrapping');
};

/**
 * Pretty-print a query string using the ES|QL AST.
 */
const prettyPrint = (queryStr: string): string => {
  try {
    // Clean up whitespace before parsing
    const cleaned = queryStr.replace(/\n\s*/g, '\n  ').trim();
    const ast = esql(cleaned).ast;
    return BasicPrettyPrinter.print(ast);
  } catch {
    return queryStr.trim();
  }
};

/**
 * Add a time range WHERE clause to an existing query using AST manipulation.
 *
 * Inserts `WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend` right after
 * the source command (FROM/TS).
 */
export const addTimeRangeFilter = (query: string): string => {
  if (query.includes('?_tstart') || query.includes('?_tend')) {
    return query;
  }

  try {
    const composedQuery = esql(query);
    const ast = composedQuery.ast;
    const whereCommand = synth.cmd`WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;
    mutate.generic.commands.insert(ast, whereCommand, 1);
    return BasicPrettyPrinter.print(ast);
  } catch {
    return `${query} | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend`;
  }
};

// Convenience exports for backward compatibility
export const buildSummaryQuery = (
  metric: CuratedMetricQuery,
  options: Omit<BuildQueryOptions, 'trend' | 'interval'>
): string => buildQuery(metric, { ...options, trend: false });

export const buildTrendQuery = (
  metric: CuratedMetricQuery,
  options: BuildQueryOptions & { interval: string }
): string => buildQuery(metric, { ...options, trend: true });
