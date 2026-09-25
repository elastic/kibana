/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendToESQLQuery,
  hasTransformationalCommand,
  formatEsqlIdentifier,
  formatEsqlEntityPredicate,
} from '@kbn/esql-utils';
import type { BenchmarkSeries } from './analyze_series';
import type { Scope, Transport } from './transport';

// One spare row detects truncation; batches stay below ES|QL's default 10,000-row ceiling.
const MAX_ROWS = 9_000;
const MAX_BUCKETS = 96;
const TARGET_BUCKETS = 48;
const GROUP = '__activity_group';
const TIME = '__activity_time';
const COUNT = '__activity_count';
const CATEGORICAL_TYPES = new Set(['keyword', 'boolean', 'ip']);

export interface CollectionOptions {
  scope: Scope;
  fieldCount: number;
  maxGroups: number;
  asOfMs: number;
}

/** Enumerates groups before batching their complete series, retaining the original query population. */
export const collectSeries = async (
  { scope, fieldCount, maxGroups, asOfMs }: CollectionOptions,
  transport: Transport,
  signal: AbortSignal
) => {
  if (hasTransformationalCommand(scope.query))
    throw new Error('Transformational queries are outside this experiment');
  const query = scope.query;
  const append = (suffix: string) => appendToESQLQuery(query, suffix);
  const from = Date.parse(scope.timeRange.from);
  const to = Date.parse(scope.timeRange.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to)
    throw new Error('Invalid absolute time range');
  const intervalMs = Math.max(1, Math.ceil((to - from) / 1000 / TARGET_BUCKETS)) * 1000;
  const completeTo = Math.min(to, asOfMs);
  const columns = (await transport.esql(append('| LIMIT 0'), signal, 'selection', scope)).columns;
  if (columns.some(({ name }) => [GROUP, TIME, COUNT].includes(name)))
    throw new Error('Benchmark column name collision');
  if (!columns.some(({ name }) => name === scope.timeFieldName))
    throw new Error('Time field is missing from query output');
  const eligibleFields = columns
    .filter(({ type }) => CATEGORICAL_TYPES.has(type))
    .map(({ name }) => name)
    .sort();
  const fields = eligibleFields.slice(0, fieldCount);
  if (fields.length < fieldCount)
    throw new Error(`Requested ${fieldCount} categorical fields; found ${fields.length}`);
  const series: BenchmarkSeries[] = [];
  const coverage: Array<{ field: string; groups: number; status: string }> = [];
  let startTimeMs: number | undefined;
  let bucketCount = 0;

  for (const field of fields) {
    const enumeration = await transport.esql(
      append(
        `| STATS ${COUNT} = COUNT(*) BY ${GROUP} = ${formatEsqlIdentifier(field)} | LIMIT ${
          maxGroups + 2
        }`
      ),
      signal,
      'selection',
      scope
    );
    const valueColumn = enumeration.columns.findIndex(({ name }) => name === GROUP);
    const totalColumn = enumeration.columns.findIndex(({ name }) => name === COUNT);
    if (valueColumn < 0 || totalColumn < 0) throw new Error('Missing grouping columns');
    const expectedTotals = new Map<BenchmarkSeries['value'], number>();
    const values = enumeration.values.map((row) => {
      const value = row[valueColumn];
      const total = row[totalColumn];
      if (value !== null && typeof value !== 'string' && typeof value !== 'boolean')
        throw new Error('Non-scalar categorical group');
      if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0)
        throw new Error('Invalid group total');
      expectedTotals.set(value, total);
      return value;
    });
    if (new Set(values).size !== values.length) throw new Error('Duplicate groups in enumeration');
    // Missing values get their own series, in addition to the non-null cardinality budget.
    if (values.filter((value) => value !== null).length > maxGroups) {
      coverage.push({ field, groups: values.length, status: 'group-limit-exceeded' });
      continue;
    }
    coverage.push({ field, groups: values.length, status: 'complete' });
    const batchSize = Math.floor(MAX_ROWS / MAX_BUCKETS);
    for (let offset = 0; offset < values.length; offset += batchSize) {
      const batch = values.slice(offset, offset + batchSize);
      // Filter AFTER STATS: LIMIT and multivalue membership keep their original meaning.
      // This bounds response size, not aggregation work: repeated scans are part of the measurement.
      const predicate = batch.map((value) => formatEsqlEntityPredicate(GROUP, value)).join(' OR ');
      const table = await transport.esql(
        append(
          `| STATS ${COUNT} = COUNT(*) BY ${TIME} = BUCKET(${formatEsqlIdentifier(
            scope.timeFieldName
          )}, ${intervalMs / 1000} seconds), ${GROUP} = ${formatEsqlIdentifier(field)} ` +
            `| WHERE ${predicate} | LIMIT ${MAX_ROWS + 1}`
        ),
        signal,
        'aggregation',
        scope
      );
      if (table.values.length > MAX_ROWS)
        throw new Error('Bucket response exceeds the complete-result budget');
      const timeColumn = table.columns.findIndex(({ name }) => name === TIME);
      const groupColumn = table.columns.findIndex(({ name }) => name === GROUP);
      const countColumn = table.columns.findIndex(({ name }) => name === COUNT);
      if ([timeColumn, groupColumn, countColumn].some((index) => index < 0))
        throw new Error('Missing bucket columns');
      const rows = table.values.map((row) => {
        const time = row[timeColumn];
        const start = typeof time === 'string' ? Date.parse(time) : time;
        const count = row[countColumn];
        const value = row[groupColumn];
        if (
          typeof start !== 'number' ||
          !Number.isSafeInteger(start) ||
          typeof count !== 'number' ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          (value !== null && typeof value !== 'string' && typeof value !== 'boolean') ||
          !batch.includes(value)
        )
          throw new Error('Invalid bucket response');
        return { start, count, value };
      });
      if (!rows.length) throw new Error('Groups disappeared between enumeration and aggregation');
      const anchor = rows[0].start;
      const first = anchor + Math.ceil((from - anchor) / intervalMs) * intervalMs;
      const end = anchor + Math.floor((completeTo - anchor) / intervalMs) * intervalMs;
      const length = (end - first) / intervalMs;
      if (
        length < 24 ||
        length > MAX_BUCKETS ||
        (startTimeMs !== undefined && first !== startTimeMs)
      ) {
        throw new Error('Insufficient complete buckets or inconsistent alignment');
      }
      startTimeMs = first;
      bucketCount = length;
      for (const value of batch) {
        const counts = Array<number>(length).fill(0);
        const seen = new Set<number>();
        const groupRows = rows.filter((item) => item.value === value);
        if (
          !groupRows.length ||
          groupRows.reduce((sum, row) => sum + row.count, 0) !== expectedTotals.get(value)
        ) {
          throw new Error(
            'Group counts changed between enumeration and aggregation; use immutable input and repeatable LIMIT ordering'
          );
        }
        for (const row of groupRows) {
          const index = (row.start - first) / intervalMs;
          if (!Number.isInteger(index) || seen.has(index))
            throw new Error('Misaligned or duplicate bucket');
          seen.add(index);
          if (index >= 0 && index < length) counts[index] = row.count;
        }
        series.push({ field, value, counts });
      }
    }
  }
  return {
    series,
    coverage,
    eligibleFields,
    fields,
    intervalMs,
    startTimeMs: startTimeMs ?? from,
    bucketCount,
  };
};
