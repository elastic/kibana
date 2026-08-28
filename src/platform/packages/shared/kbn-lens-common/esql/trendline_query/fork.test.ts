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
  queryHasStatsCommand,
} from './trendline_query';

describe('buildTrendlineQueryWithMetricFieldMap with FORK', () => {
  it('derives the trendline from the FORK branch producing the metric column', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'FROM kibana_sample_data_flights | FORK (STATS `Total Flights` = COUNT(*)) (STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend))',
      'timestamp',
      ['Total Flights']
    );

    expect(result.query).toBe(
      'FROM kibana_sample_data_flights | STATS `Total Flights` = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.size).toBe(0);
    expect(result.timeField).toBe('BUCKET(timestamp, 75, ?_tstart, ?_tend)');
  });

  it('preserves an existing aliased BUCKET when the metric column comes from that FORK branch', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'FROM kibana_sample_data_flights | FORK (STATS `Total Flights` = COUNT(*)) (STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend))',
      'timestamp',
      ['Flight Count']
    );

    expect(result.query).toBe(
      'FROM kibana_sample_data_flights | STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.timeField).toBe('Time Bucket');
  });

  it('aggregates metric fields when the selected FORK branch has no STATS', () => {
    const result = buildTrendlineQueryWithMetricFieldMap(
      'FROM index | FORK (WHERE bytes > 0) (LIMIT 5)',
      '@timestamp',
      ['bytes']
    );

    expect(result.query).toBe(
      'FROM index | WHERE bytes > 0 | STATS AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
    expect(result.metricFieldMap.get('bytes')).toBe('AVG(bytes)');
  });
});

describe('appendTimeBucketToEsqlQuery with FORK', () => {
  it('inlines the metric-producing FORK branch and appends BUCKET', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM kibana_sample_data_flights | FORK (STATS `Total Flights` = COUNT(*)) (STATS `Flight Count` = COUNT(*) BY `Time Bucket` = BUCKET(timestamp, 75, ?_tstart, ?_tend))',
      'timestamp',
      ['Total Flights']
    );
    expect(result).toBe(
      'FROM kibana_sample_data_flights | STATS `Total Flights` = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('falls back to the first FORK branch with STATS when no metric fields are given', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (WHERE bytes > 0) (STATS total = SUM(bytes))',
      '@timestamp'
    );
    expect(result).toBe(
      'FROM index | STATS total = SUM(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('selects the FORK branch matching an unaliased aggregation expression', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS COUNT(*)) (STATS total = SUM(bytes))',
      '@timestamp',
      ['COUNT(*)']
    );
    expect(result).toBe('FROM index | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)');
  });

  it('keeps commands before FORK and handles WHERE branches', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | WHERE region == "us" | FORK (STATS a = COUNT(*)) (STATS b = MAX(bytes))',
      'timestamp',
      ['b']
    );
    expect(result).toBe(
      'FROM index | WHERE region == "us" | STATS b = MAX(bytes) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('removes the synthetic _fork column from a KEEP after FORK', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | KEEP _fork, a',
      'timestamp',
      ['a']
    );
    expect(result).toBe(
      'FROM index | STATS a = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend) | KEEP a, `BUCKET(timestamp, 75, ?_tstart, ?_tend)`'
    );
  });

  it('drops a WHERE that filters on the synthetic _fork column', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | WHERE _fork == "fork1"',
      'timestamp',
      ['a']
    );
    expect(result).toBe(
      'FROM index | STATS a = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('removes the synthetic _fork column from a SORT after FORK', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | SORT _fork',
      'timestamp',
      ['a']
    );
    expect(result).toBe(
      'FROM index | STATS a = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });

  it('selects the branch whose metric column is produced via RENAME inside the branch', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS x = COUNT(*) | RENAME x AS a) (STATS b = COUNT(*))',
      'timestamp',
      ['a']
    );
    expect(result).toBe(
      'FROM index | STATS x = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend) | RENAME x AS a'
    );
  });

  it('drops a KEEP that only referenced the synthetic _fork column', () => {
    const result = appendTimeBucketToEsqlQuery(
      'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | KEEP _fork',
      'timestamp',
      ['a']
    );
    expect(result).toBe(
      'FROM index | STATS a = COUNT(*) BY BUCKET(timestamp, 75, ?_tstart, ?_tend)'
    );
  });
});

describe('queryHasStatsCommand', () => {
  it('returns true for a top-level STATS command', () => {
    expect(queryHasStatsCommand('FROM index | STATS COUNT(*)')).toBe(true);
  });

  it('returns false when the query has no STATS', () => {
    expect(queryHasStatsCommand('FROM index | KEEP bytes')).toBe(false);
  });

  it('returns true for STATS nested inside a FORK branch', () => {
    expect(
      queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (STATS total = SUM(bytes))')
    ).toBe(true);
  });

  it('returns false for FORK without any STATS branch', () => {
    expect(queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (LIMIT 5)')).toBe(false);
  });
});
