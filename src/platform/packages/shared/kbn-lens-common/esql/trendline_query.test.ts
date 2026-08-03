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

  it('extracts the matching FORK STATS branch and buckets it (timestamp still in scope)', () => {
    const forkQuery = [
      'FROM kibana_sample_data_flights',
      '| FORK (STATS `Total Flights` = COUNT(*))',
      '       (STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend))',
    ].join('\n');

    const result = appendTimeBucketToEsqlQuery(forkQuery, 'timestamp', ['Total Flights']);

    expect(result).toBe(
      'FROM kibana_sample_data_flights | STATS `Total Flights` = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result).not.toContain('FORK');
    expect(result).not.toMatch(/FORK[\s\S]*BUCKET\(timestamp/);
  });

  it('preserves pre-FORK commands when extracting a STATS branch for the trendline', () => {
    const forkQuery =
      'FROM index | WHERE status == "ok" | FORK (STATS total = COUNT(*)) (STATS total = COUNT(*) BY category)';

    expect(appendTimeBucketToEsqlQuery(forkQuery, 'timestamp', ['total'])).toBe(
      'FROM index | WHERE status == "ok" | STATS total = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('falls back to the first FORK STATS branch when metric fields do not match', () => {
    const forkQuery =
      'FROM index | FORK (STATS total = SUM(bytes)) (STATS count = COUNT(*) BY host)';

    expect(appendTimeBucketToEsqlQuery(forkQuery, '@timestamp', ['missing'])).toBe(
      'FROM index | STATS total = SUM(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
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
  });

  it('keeps FORK aggregate column names (no AVG wrap) when building a trendline query', () => {
    const forkQuery =
      'FROM kibana_sample_data_flights | FORK (STATS `Total Flights` = COUNT(*)) (STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend))';

    const result = buildTrendlineQueryWithMetricFieldMap(forkQuery, 'timestamp', [
      'Total Flights',
    ]);

    expect(result.query).toBe(
      'FROM kibana_sample_data_flights | STATS `Total Flights` = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.size).toBe(0);
  });
});
