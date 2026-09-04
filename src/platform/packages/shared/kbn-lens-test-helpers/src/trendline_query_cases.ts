/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared trendline rewrite case matrix for ES|QL metric charts.
 *
 * Single source of truth consumed by two layers:
 * - unit tests (this package): assert the generated query and time field for
 *   every case — fast first line of defense, no infra required
 * - Scout API tests (Lens plugin): execute the source and generated queries
 *   against a real Elasticsearch to catch regressions in query validity,
 *   result schema and ES-side semantics
 *
 * Queries reference fields of the `kibana_sample_data_logstsdb` ES archive
 * (`bytes`, `bytes_gauge`, `phpmemory`, `request`, `@timestamp`) so every
 * case is executable when bound to that index.
 */
export interface TrendlineQueryCase {
  readonly description: string;
  readonly sourceQuery: string;
  readonly expectedQuery: string;
  readonly expectedTimeField: string;
  readonly expectedMetricFields: readonly string[];
  readonly metricFields?: readonly string[];
  readonly groupByFields?: readonly string[];
  /** When set, unit consumers assert the generated metricFieldMap equals this record. */
  readonly expectedMetricFieldMap?: Readonly<Record<string, string>>;
}

export const buildTrendlineQueryCases = ({ index }: { index: string }): TrendlineQueryCase[] => {
  const tsQuery = `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY TBUCKET(100)`;
  const aliasedTsQuery = `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY custom_time_bucket = TBUCKET(100)`;

  return [
    {
      description: 'TS query with TBUCKET',
      sourceQuery: tsQuery,
      expectedQuery: tsQuery,
      expectedTimeField: 'TBUCKET(100)',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'TS query with aliased TBUCKET',
      sourceQuery: aliasedTsQuery,
      expectedQuery: aliasedTsQuery,
      expectedTimeField: 'custom_time_bucket',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'regular source query',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes)`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['avg_bytes'],
      expectedMetricFieldMap: {},
    },
    {
      description: 'raw query without STATS',
      sourceQuery: `FROM ${index} | KEEP bytes`,
      expectedQuery: `FROM ${index} | KEEP bytes, @timestamp | STATS AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['AVG(bytes)'],
      metricFields: ['bytes'],
      expectedMetricFieldMap: { bytes: 'AVG(bytes)' },
    },
    {
      description: 'raw query with breakdown',
      sourceQuery: `FROM ${index}`,
      expectedQuery: `FROM ${index} | STATS AVG(bytes) BY request, BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['AVG(bytes)', 'request'],
      metricFields: ['bytes'],
      groupByFields: ['request'],
      expectedMetricFieldMap: { bytes: 'AVG(bytes)' },
    },
    {
      description: 'TS query without TBUCKET',
      sourceQuery: `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY request`,
      expectedQuery: `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY request, TBUCKET(75)`,
      expectedTimeField: 'TBUCKET(75)',
      expectedMetricFields: ['avg_bytes', 'request'],
    },
    {
      description: 'FROM query with existing TBUCKET',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY TBUCKET(100)`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY TBUCKET(100)`,
      expectedTimeField: 'TBUCKET(100)',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with aliased TBUCKET',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY time_bucket = TBUCKET(100)`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY time_bucket = TBUCKET(100)`,
      expectedTimeField: 'time_bucket',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with KEEP after STATS',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) | KEEP avg_bytes`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend) | KEEP avg_bytes, \`BUCKET(@timestamp, 75, ?_tstart, ?_tend)\``,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with aliased BUCKET and KEEP after STATS',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY time_bucket = BUCKET(@timestamp, 1 hour) | KEEP avg_bytes`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY time_bucket = BUCKET(@timestamp, 1 hour) | KEEP avg_bytes, time_bucket`,
      expectedTimeField: 'time_bucket',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'TS query with renamed TBUCKET column',
      sourceQuery: `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY bucket = TBUCKET(100) | RENAME bucket AS time`,
      expectedQuery: `TS ${index} | STATS avg_bytes = AVG(AVG_OVER_TIME(bytes_gauge)) BY bucket = TBUCKET(100) | RENAME bucket AS time`,
      expectedTimeField: 'time',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with renamed BUCKET column and KEEP',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 hour) | RENAME bucket AS time | KEEP avg_bytes`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 hour) | RENAME bucket AS time | KEEP avg_bytes, time`,
      expectedTimeField: 'time',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'raw query with multiple metric fields',
      sourceQuery: `FROM ${index}`,
      expectedQuery: `FROM ${index} | STATS AVG(bytes), AVG(phpmemory) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['AVG(bytes)', 'AVG(phpmemory)'],
      metricFields: ['bytes', 'phpmemory'],
    },
    {
      description: 'raw query without metric fields falls back to COUNT(*)',
      sourceQuery: `FROM ${index}`,
      expectedQuery: `FROM ${index} | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['COUNT(*)'],
      expectedMetricFieldMap: {},
    },
    {
      description: 'query with an existing BUCKET on the time field is unchanged',
      sourceQuery: `FROM ${index} | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedQuery: `FROM ${index} | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['COUNT(*)'],
    },
    {
      description: 'FROM query with KEEP before STATS',
      sourceQuery: `FROM ${index} | KEEP bytes | STATS avg_bytes = AVG(bytes)`,
      expectedQuery: `FROM ${index} | KEEP bytes, @timestamp | STATS avg_bytes = AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
      expectedTimeField: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with TBUCKET renamed via assignment form',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY bucket = TBUCKET(100) | RENAME time = bucket`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY bucket = TBUCKET(100) | RENAME time = bucket`,
      expectedTimeField: 'time',
      expectedMetricFields: ['avg_bytes'],
    },
    {
      description: 'FROM query with aliased BUCKET through chained RENAMEs',
      sourceQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY b = BUCKET(@timestamp, 1 hour) | RENAME b AS c | RENAME c AS d`,
      expectedQuery: `FROM ${index} | STATS avg_bytes = AVG(bytes) BY b = BUCKET(@timestamp, 1 hour) | RENAME b AS c | RENAME c AS d`,
      expectedTimeField: 'd',
      expectedMetricFields: ['avg_bytes'],
    },
  ];
};
