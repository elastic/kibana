/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildTrendlineBucketExpression,
  appendTimeBucketToEsqlQuery,
  buildTrendlineQueryWithMetricFieldMap,
} from './trendline_query';

describe('buildTrendlineBucketExpression', () => {
  it('builds a BUCKET expression', () => {
    expect(buildTrendlineBucketExpression('timestamp')).toBe(
      'BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('escapes dotted field names with backticks', () => {
    expect(buildTrendlineBucketExpression('order.date')).toBe(
      'BUCKET(`order.date`, 75, ?_tstart, ?_tend)'
    );
  });
});

describe('appendTimeBucketToEsqlQuery', () => {
  it('appends STATS COUNT(*) BY when query has no STATS', () => {
    expect(appendTimeBucketToEsqlQuery('FROM index', 'timestamp')).toBe(
      'FROM index | STATS COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('appends BY when query has STATS without BY', () => {
    expect(appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price)', 'timestamp')).toBe(
      'FROM index | STATS AVG(price) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('appends to existing BY clause', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | STATS AVG(price) BY category', 'timestamp')
    ).toBe('FROM index | STATS AVG(price) BY category, BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('normalizes keyword casing in output', () => {
    expect(
      appendTimeBucketToEsqlQuery('FROM index | stats avg(price) by region', '@timestamp')
    ).toBe('FROM index | STATS AVG(price) BY region, BUCKET(@timestamp, 75, ?_tstart, ?_tend)');
  });

  it('handles WHERE clause before STATS', () => {
    expect(
      appendTimeBucketToEsqlQuery(
        'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes)',
        'timestamp'
      )
    ).toBe(
      'FROM index | WHERE status >= ?_tstart AND status <= ?_tend | STATS MEDIAN(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('appends bucket to the last STATS in a query with multiple piped STATS', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | STATS total = SUM(bytes) BY host | STATS AVG(total)',
      'timestamp'
    );
    expect(result).toBe(
      'FROM index | STATS total = SUM(bytes) BY host | STATS AVG(total) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
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

  it('does not add a duplicate BUCKET when one already exists for the same field', () => {
    const query = 'FROM index | STATS COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)';
    const result = appendTimeBucketToEsqlQuery(query, 'timestamp');
    expect(result).toBe('FROM index | STATS COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('adds BUCKET when one exists for a different field', () => {
    const query = 'FROM index | STATS COUNT(*) BY BUCKET(other_field, 75, ?_tstart, ?_tend)';
    const result = appendTimeBucketToEsqlQuery(query, 'timestamp');
    expect(result).toBe(
      'FROM index | STATS COUNT(*) BY BUCKET(other_field, 75, ?_tstart, ?_tend), BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('uses AVG(field) instead of COUNT(*) when metricFields are provided and query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['bytes']);
    expect(result).toBe('FROM index | STATS AVG(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('uses AVG for multiple metric fields when query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', [
      'bytes',
      'response_time',
    ]);
    expect(result).toBe(
      'FROM index | STATS AVG(bytes), AVG(response_time) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('escapes dotted metric field names in AVG', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['order.bytes']);
    expect(result).toBe(
      'FROM index | STATS AVG(`order.bytes`) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('ignores metricFields when query already has STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index | STATS SUM(bytes)', 'timestamp', [
      'bytes',
    ]);
    expect(result).toBe('FROM index | STATS SUM(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('falls back to COUNT(*) when metricFields is empty and query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', []);
    expect(result).toBe('FROM index | STATS COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('adds group by fields before BUCKET when query has no STATS', () => {
    const result = appendTimeBucketToEsqlQuery('FROM index', 'timestamp', ['bytes'], ['host']);
    expect(result).toBe(
      'FROM index | STATS AVG(bytes) BY host, BUCKET(timestamp, 75, ?_tstart, ?_tend)'
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
      'FROM index | STATS AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('preserves an existing TBUCKET in the first STATS after TS', () => {
    const query = 'TS metrics-* | STATS AVG(cpu) BY TBUCKET(100)';
    expect(appendTimeBucketToEsqlQuery(query, '@timestamp')).toBe(query);
  });

  it('preserves an aliased TBUCKET without adding a regular BUCKET', () => {
    const query = 'TS metrics-* | STATS AVG(cpu) BY time_bucket = TBUCKET(1 hour)';
    const result = appendTimeBucketToEsqlQuery(query, '@timestamp');
    expect(result).toBe(query);
    expect(result).not.toContain('BUCKET(@timestamp');
  });

  it('adds TBUCKET to the first STATS after TS', () => {
    const result = appendTimeBucketToEsqlQuery(
      'TS metrics-* | STATS AVG(cpu) BY host',
      '@timestamp'
    );
    expect(result).toBe('TS metrics-* | STATS AVG(cpu) BY host, TBUCKET(75)');
    expect(result).not.toContain('BUCKET(@timestamp');
  });

  it('does not apply TS bucketing semantics to a later STATS command', () => {
    const query =
      'TS metrics-* | STATS total = AVG(cpu) BY TBUCKET(100) | STATS MAX(total) BY TBUCKET(100)';
    expect(appendTimeBucketToEsqlQuery(query, '@timestamp')).toBe(query);
  });
});

describe('buildTrendlineQueryWithMetricFieldMap', () => {
  it('returns generated query and metric result field names for a query without STATS', () => {
    const result = buildTrendlineQueryWithMetricFieldMap('FROM index | KEEP bytes', 'timestamp', [
      'bytes',
    ]);

    expect(result.query).toBe(
      'FROM index | KEEP bytes | STATS AVG(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.get('bytes')).toBe('AVG(bytes)');
    expect(result.timeField).toBe('BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('keeps breakdown fields in BY instead of aggregating them for a query without STATS', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'FROM index',
      '@timestamp',
      ['bytes'],
      ['host']
    );

    expect(result.query).toBe(
      'FROM index | STATS AVG(bytes) BY host, BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.get('bytes')).toBe('AVG(bytes)');
    expect(result.metricFieldMap.has('host')).toBe(false);
  });

  it('returns an empty metric field map when the query already has STATS', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'FROM index | STATS avg_bytes = AVG(bytes)',
      'timestamp',
      ['bytes']
    );

    expect(result.query).toBe(
      'FROM index | STATS avg_bytes = AVG(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.size).toBe(0);
    expect(result.timeField).toBe('BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('returns an unaliased TBUCKET expression as the time result column', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY TBUCKET(100)',
      '@timestamp'
    );

    expect(result.query).toBe('TS metrics-* | STATS avg_cpu = AVG(cpu) BY TBUCKET(100)');
    expect(result.timeField).toBe('TBUCKET(100)');
  });

  it('returns the user-defined TBUCKET alias as the time result column', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY `Over time` = TBUCKET(1 hour)',
      '@timestamp'
    );

    expect(result.query).toBe(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY `Over time` = TBUCKET(1 hour)'
    );
    expect(result.timeField).toBe('Over time');
  });

  it('returns the generated TBUCKET expression when TS has no existing time bucket', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'TS metrics-* | STATS avg_cpu = AVG(cpu) BY host',
      '@timestamp'
    );

    expect(result.query).toBe('TS metrics-* | STATS avg_cpu = AVG(cpu) BY host, TBUCKET(75)');
    expect(result.timeField).toBe('TBUCKET(75)');
  });
});
