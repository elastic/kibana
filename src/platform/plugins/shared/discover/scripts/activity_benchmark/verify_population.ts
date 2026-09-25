/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendToESQLQuery, formatEsqlIdentifier } from '@kbn/esql-utils';
import { collectSeries, type CollectionOptions } from './collect_series';
import type { BenchmarkSeries } from './analyze_series';
import type { Scope, Transport } from './transport';

const MAX_RAW_ROWS = 9000;

/** Checks aggregate counts against the entire bounded query result, outside timed benchmark runs. */
export const verifyPopulation = async (
  scope: Scope,
  transport: Transport,
  options: Omit<CollectionOptions, 'scope'>,
  signal: AbortSignal
): Promise<{ verified: true; rows: number; fields: string[]; groups: number; buckets: number }> => {
  const collection = await collectSeries({ scope, ...options }, transport, signal);
  const { fields, series, bucketCount, startTimeMs, intervalMs } = collection;
  if (!series.length || collection.coverage.some(({ status }) => status !== 'complete')) {
    throw new Error('Population verification requires complete field and group coverage');
  }
  const projection = [...new Set([scope.timeFieldName, ...fields])]
    .map(formatEsqlIdentifier)
    .join(', ');
  const raw = await transport.esql(
    appendToESQLQuery(scope.query, `| KEEP ${projection} | LIMIT ${MAX_RAW_ROWS + 1}`),
    signal,
    'population-verification',
    scope
  );
  if (raw.values.length > MAX_RAW_ROWS) {
    throw new Error(
      'Population exceeds 9000 rows; use a controlled scope with unique SORT ordering and LIMIT <= 9000'
    );
  }
  const column = (name: string) => {
    const index = raw.columns.findIndex((item) => item.name === name);
    if (index < 0) throw new Error('Population verification is missing a projected column');
    return index;
  };
  const timeColumn = column(scope.timeFieldName);
  const populations = fields.map((field) => ({
    field,
    column: column(field),
    groups: new Map<BenchmarkSeries['value'], number[]>(),
  }));
  for (const row of raw.values) {
    const time = row[timeColumn];
    const timestamp = typeof time === 'string' ? Date.parse(time) : time;
    if (typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp)) {
      throw new Error('Population verification requires scalar valid timestamps');
    }
    const bucket = Math.floor((timestamp - startTimeMs) / intervalMs);
    for (const population of populations) {
      const cell = row[population.column];
      const values = Array.isArray(cell) ? (cell.length ? cell : [null]) : [cell];
      for (const value of new Set(values)) {
        if (value !== null && typeof value !== 'string' && typeof value !== 'boolean') {
          throw new Error('Population verification requires categorical values');
        }
        const counts = population.groups.get(value) ?? Array<number>(bucketCount).fill(0);
        // Keep groups seen only at the edges, but never count their incomplete buckets.
        if (bucket >= 0 && bucket < bucketCount) counts[bucket]++;
        population.groups.set(value, counts);
      }
    }
  }
  for (const expected of series) {
    const population = populations.find(({ field }) => field === expected.field);
    const actual = population?.groups.get(expected.value);
    const mismatch = expected.counts.findIndex((count, bucket) => count !== actual?.[bucket]);
    if (mismatch >= 0) {
      const group = JSON.stringify({ field: expected.field, value: expected.value }).slice(0, 200);
      throw new Error(
        `Population mismatch for ${group}, bucket ${mismatch}: expected ${
          expected.counts[mismatch]
        }, raw ${actual?.[mismatch] ?? 'missing'}`
      );
    }
    population?.groups.delete(expected.value);
  }
  if (populations.some(({ groups }) => groups.size > 0)) {
    throw new Error('Raw query contains groups absent from the aggregate collection');
  }
  signal.throwIfAborted();
  return {
    verified: true,
    rows: raw.values.length,
    fields,
    groups: series.length,
    buckets: bucketCount,
  };
};
