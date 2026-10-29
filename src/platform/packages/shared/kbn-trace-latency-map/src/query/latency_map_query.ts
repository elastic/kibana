/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { ComposerQuery } from '@elastic/esql';
import type { DurationStats, LatencyMapUnit, TraceSource } from '../types';
import { ESQL_MAX_ROWS, LATENCY_MAP_INNER_ROWS, getLogDurationBounds } from './duration_rows';
import type { TimeGrid } from './time_grid';
import {
  DURATION_US_COLUMN,
  FAILED_SPAN_CONDITION,
  IS_FAILED_COLUMN,
  NORMALIZE_COMMANDS,
  NOT_FAILED_CONDITION,
  ROOT_SPAN_CONDITION,
  TRACES_INDEX_PATTERN,
  durationAtLeastCondition,
  durationBelowCondition,
} from './fields';

/** Above this many spans in the range, the map samples its dense part. */
export const MAP_SPAN_BUDGET = 500_000;

/**
 * How the map reads a large range: failed spans and the slowest ones (from the p95 on)
 * exactly, the rest from a random sample sized to {@link MAP_SPAN_BUDGET}. Errors and slow
 * requests are rare, so a plain sample would thin out exactly what users look for.
 */
export interface MapSampling {
  /** Share of the other spans read. */
  probability: number;
  /** Spans from this duration (µs) on are read exactly. */
  tailUs: number;
}

export function getMapSampling(stats: DurationStats): MapSampling | undefined {
  if (stats.spans <= MAP_SPAN_BUDGET) return undefined;
  return { probability: MAP_SPAN_BUDGET / stats.spans, tailUs: stats.p95 };
}

/** One part of a map query: the spans it reads, and the share of them it samples. */
export interface MapQueryPart {
  /** ES|QL condition over raw fields, so Elasticsearch filters it with its index. */
  condition: string;
  probability?: number;
}

/** The exact part and the sampled part, which together cover every span once. */
export function getMapQueryParts({ probability, tailUs }: MapSampling): MapQueryPart[] {
  const tail = Math.floor(tailUs);
  return [
    { condition: `(${FAILED_SPAN_CONDITION} OR ${durationAtLeastCondition(tail)})` },
    { condition: `(${NOT_FAILED_CONDITION}) AND (${durationBelowCondition(tail)})`, probability },
  ];
}

/**
 * The source a map reads: traces are root spans only, and the host's map-only conditions
 * and its scoping condition narrow every query and every cell.
 */
export function getMapSource(
  source: TraceSource,
  {
    unit = 'spans',
    selectionCondition,
    mapFilters = [],
  }: { unit?: LatencyMapUnit; selectionCondition?: string; mapFilters?: string[] }
): TraceSource {
  const conditions = [
    ...(unit === 'traces' ? [ROOT_SPAN_CONDITION] : []),
    ...(selectionCondition ? [selectionCondition] : []),
    ...mapFilters,
  ];
  return conditions.length
    ? { ...source, filters: [...(source.filters ?? []), ...conditions] }
    : source;
}

/** `SET`, `FROM`, the time range and every condition, then the duration and outcome columns. */
function buildSpans(
  { indexPattern = TRACES_INDEX_PATTERN, timeRange, filters = [] }: TraceSource,
  part?: MapQueryPart
): ComposerQuery {
  const conditions = [
    ...(part ? [part.condition] : []),
    // Throws on an invalid timestamp, which keeps anything else out of the query.
    `@timestamp >= TO_DATETIME("${new Date(timeRange.from).toISOString()}")`,
    `@timestamp < TO_DATETIME("${new Date(timeRange.to).toISOString()}")`,
    ...filters,
  ];
  const [firstIndex, ...otherIndices] = indexPattern.split(',').map((index) => index.trim());
  const query = esql.from(firstIndex, ...otherIndices);
  // Fields missing from every queried index become null instead of failing the query, so
  // one query runs on classic-only, OTel-only, and mixed clusters.
  query.addSetCommand('unmapped_fields', 'NULLIFY');
  // Each condition in brackets: a host's `a OR b` would otherwise escape the time range.
  query.pipe(`WHERE ${conditions.map((condition) => `(${condition})`).join(' AND ')}`);
  if (part?.probability !== undefined) query.pipe(`SAMPLE ${part.probability}`);
  NORMALIZE_COMMANDS.forEach((command) => query.pipe(command));
  query.pipe(`WHERE ${DURATION_US_COLUMN} > 0`);
  return query;
}

/** Step 1: the duration statistics of the range, which define the rows of the map. */
export function buildDurationStatsQuery(source: TraceSource): string {
  return buildSpans(source)
    .pipe(
      `STATS min = MIN(${DURATION_US_COLUMN}), p90 = PERCENTILE(${DURATION_US_COLUMN}, 90), p95 = PERCENTILE(${DURATION_US_COLUMN}, 95), p99 = PERCENTILE(${DURATION_US_COLUMN}, 99), max = MAX(${DURATION_US_COLUMN}), spans = COUNT(*)`
    )
    .print('pipe-multiline');
}

/** The row of each span, the same binning as `rowToDurationUs`. */
function buildRowExpression(stats: DurationStats) {
  const { logMin, logMax } = getLogDurationBounds(stats);
  const inner = LATENCY_MAP_INNER_ROWS;
  const logRow = `TO_INTEGER(FLOOR((LOG10(TO_DOUBLE(${DURATION_US_COLUMN})) - ${logMin}) / ${
    logMax - logMin
  } * ${inner}))`;
  return `CASE(${DURATION_US_COLUMN} >= ${stats.p99}, ${inner}, GREATEST(0, LEAST(${
    inner - 1
  }, ${logRow})))`;
}

/**
 * Step 2: span and failure counts per (time column, duration row), binned in Elasticsearch
 * with the rows from step 1. Two plain queries are several times faster than one query
 * computing the rows with INLINE STATS.
 *
 * `part` is one part of a sampled range, see {@link getMapQueryParts}.
 */
export function buildLatencyGridQuery(
  source: TraceSource,
  stats: DurationStats,
  { fromMs, binMs }: TimeGrid,
  part?: MapQueryPart
): string {
  return buildSpans(source, part)
    .pipe(`EVAL yi = ${buildRowExpression(stats)}`)
    .pipe(`EVAL xi = TO_INTEGER((TO_LONG(@timestamp) - ${fromMs}) / ${binMs})`)
    .pipe(`STATS spans = COUNT(*), failed = COUNT(*) WHERE ${IS_FAILED_COLUMN} BY xi, yi`)
    .pipe(`LIMIT ${ESQL_MAX_ROWS}`)
    .print('pipe-multiline');
}
