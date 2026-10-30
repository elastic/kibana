/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendTimeBucketToEsqlQuery,
  buildTrendlineQueryWithMetricFieldMap,
} from './trendline_query';

// Common rewrite shapes (TS/TBUCKET, KEEP/RENAME, FORK) are covered by the
// shared case matrix from @kbn/lens-test-helpers (trendline_query_cases.test.ts);
// this file keeps behaviors and assertions the matrix does not exercise.
describe('appendTimeBucketToEsqlQuery', () => {
  it('appends BY when query has STATS without BY', () => {
    expect(appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price)', 'timestamp')).toBe(
      'FROM index | STATS AVG(price) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('appends to existing BY clause', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price) BY category', 'timestamp')
    ).toBe('FROM index | STATS AVG(price) BY category, BUCKET(timestamp, 100, ?_tstart, ?_tend)');
  });

  it('normalizes keyword casing in output', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | stats avg(price) by region', '@timestamp')
    ).toBe('FROM index | STATS AVG(price) BY region, BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
  });

  it('handles WHERE clause before STATS', () => {
    expect(
      appendTimeBucketToEsqlQuery(
        'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes)',
        'timestamp'
      )
    ).toBe(
      'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('throws on empty query', () => {
    expect(() => appendTimeBucketToEsqlQuery('', 'timestamp')).toThrow(
      'Cannot append time bucket to an empty ES|QL query'
    );
  });

  it('throws on whitespace-only query', () => {
    expect(() => appendTimeBucketToEsqlQuery('   ', 'timestamp')).toThrow(
      'Cannot append time bucket to an empty ES|QL query'
    );
  });

  it('adds BUCKET when one exists for a different field', () => {
    const query = 'FROM index | STATS COUNT(*) BY BUCKET(other_field, 100, ?_tstart, ?_tend)';
    const result = appendTimeBucketToEsqlQuery(query, 'timestamp');
    expect(result).toBe(
      'FROM index | STATS COUNT(*) BY BUCKET(other_field, 100, ?_tstart, ?_tend), BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('uses AVG(field) instead of COUNT(*) when metricFields are provided and query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['bytes']);
    expect(result).toBe(
      'FROM index | STATS AVG(bytes) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('uses AVG for multiple metric fields when query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', [
      'bytes',
      'response_time',
    ]);
    expect(result).toBe(
      'FROM index | STATS AVG(bytes), AVG(response_time) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('escapes dotted metric field names in AVG', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['order.bytes']);
    expect(result).toBe(
      'FROM index | STATS AVG(`order.bytes`) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('does not add a duplicate time field to KEEP commands', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index | KEEP bytes, timestamp', 'timestamp', [
      'bytes',
    ]);
    expect(result).toBe(
      'FROM index | KEEP bytes, timestamp | STATS AVG(bytes) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('ignores metricFields when query already has STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index | STATS SUM(bytes)', 'timestamp', [
      'bytes',
    ]);
    expect(result).toBe(
      'FROM index | STATS SUM(bytes) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('falls back to COUNT(*) when metricFields is empty and query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', []);
    expect(result).toBe('FROM index | STATS COUNT(*) BY BUCKET(timestamp, 100, ?_tstart, ?_tend)');
  });

  it('adds group by fields before BUCKET when query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['bytes'], ['host']);
    expect(result).toBe(
      'FROM index | STATS AVG(bytes) BY host, BUCKET(timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('does not add the time field as a group by field when query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index',
      '@timestamp',
      ['bytes'],
      ['@timestamp']
    );
    expect(result).toBe(
      'FROM index | STATS AVG(bytes) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend)'
    );
  });

  it('does not apply TS bucketing semantics to a later STATS command', () => {
    const query =
      'TS metrics-* | STATS total = AVG(cpu) BY host | STATS MAX(total) BY TBUCKET(100)';
    expect(appendTimeBucketToEsqlQuery(query, '@timestamp')).toBe(
      'TS metrics-* | STATS total = AVG(cpu) BY host, TBUCKET(100) | STATS MAX(total) BY TBUCKET(100), `TBUCKET(100)`'
    );
  });

  // Dotted field names are not present in the archive backing the case matrix,
  // so the escaped end-to-end KEEP + BUCKET path is pinned here.
  it('preserves a dotted time field through KEEP commands with backtick escaping', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index | KEEP bytes', 'order.date', ['bytes']);
    expect(result).toBe(
      'FROM index | KEEP bytes, `order.date` | STATS AVG(bytes) BY BUCKET(`order.date`, 100, ?_tstart, ?_tend)'
    );
  });
});

describe('buildTrendlineQueryWithMetricFieldMap', () => {
  it('rejects a bucket overwritten by EVAL when no equivalent alias survives', () => {
    expect(() =>
      buildTrendlineQueryWithMetricFieldMap(
        'FROM kibana_sample_data_logs | STATS avg_bytes = AVG(bytes) BY b = BUCKET(@timestamp, 1 hour) | EVAL b = TO_STRING(b)',
        '@timestamp'
      )
    ).toThrow('Cannot build trendline: time column [b] is no longer available');
  });

  it('rejects a source time field overwritten before aggregation', () => {
    expect(() =>
      buildTrendlineQueryWithMetricFieldMap(
        'FROM index | EVAL @timestamp = TO_STRING(@timestamp) | STATS avg_bytes = AVG(bytes)',
        '@timestamp'
      )
    ).toThrow('Cannot build trendline: time column [@timestamp] is no longer available');
  });

  // Aliases containing spaces are not expressible in the executable case matrix
  // (no such fields in the archive); pins backtick-quoted alias unquoting.
  it('returns a backtick-quoted TBUCKET alias unquoted as the time result column', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY `Over time` = TBUCKET(1 hour)',
      '@timestamp'
    );

    expect(result.query).toBe(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY `Over time` = TBUCKET(1 hour)'
    );
    expect(result.timeField).toBe('Over time');
  });
});
