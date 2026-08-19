/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildMetricsInfoQuery } from './append_metrics_info';

describe('buildMetricsInfoQuery', () => {
  it('returns empty string for empty or undefined esql', () => {
    expect(buildMetricsInfoQuery('')).toBe('');
    expect(buildMetricsInfoQuery(undefined)).toBe('');
    expect(buildMetricsInfoQuery('   ')).toBe('');
  });

  it('appends | METRICS_INFO', () => {
    expect(buildMetricsInfoQuery('FROM metrics-*')).toBe('FROM metrics-* | METRICS_INFO');
    expect(buildMetricsInfoQuery('TS INDEX')).toBe('TS INDEX | METRICS_INFO');
  });

  it('returns query as-is when METRICS_INFO is already in the pipeline', () => {
    const simpleQuery = 'TS INDEX | METRICS_INFO';
    expect(buildMetricsInfoQuery(simpleQuery)).toBe(simpleQuery);
    const withLimit = 'TS INDEX | METRICS_INFO | LIMIT 100';
    expect(buildMetricsInfoQuery(withLimit)).toBe(withLimit);
  });

  it('does not inject a postFilter when METRICS_INFO is already user-authored', () => {
    const userQuery = 'TS INDEX | METRICS_INFO';
    expect(buildMetricsInfoQuery(userQuery, 'MV_CONTAINS(dimension_fields, "environment")')).toBe(
      userQuery
    );
  });

  it('appends a caller-supplied postFilter after METRICS_INFO', () => {
    expect(buildMetricsInfoQuery('TS INDEX', 'MV_CONTAINS(dimension_fields, "environment")')).toBe(
      'TS INDEX | METRICS_INFO | WHERE MV_CONTAINS(dimension_fields, "environment")'
    );
  });

  it('ignores an empty postFilter', () => {
    expect(buildMetricsInfoQuery('TS INDEX', '')).toBe('TS INDEX | METRICS_INFO');
  });

  it('places the postFilter before LIMIT', () => {
    expect(buildMetricsInfoQuery('TS INDEX | LIMIT 10', 'foo == 1')).toBe(
      'TS INDEX | METRICS_INFO | WHERE foo == 1 | LIMIT 10'
    );
  });

  it('returns empty string for query with transformational command', () => {
    expect(buildMetricsInfoQuery('FROM x | STATS count()')).toBe('');
    expect(buildMetricsInfoQuery('FROM x | STATS count()', 'foo == 1')).toBe('');
  });

  it('inserts METRICS_INFO before LIMIT when query has LIMIT', () => {
    expect(buildMetricsInfoQuery('FROM metrics-* | LIMIT 100')).toBe(
      'FROM metrics-* | METRICS_INFO | LIMIT 100'
    );
    expect(buildMetricsInfoQuery('TS INDEX | LIMIT 10')).toBe('TS INDEX | METRICS_INFO | LIMIT 10');
  });

  it('removes SORT from the query', () => {
    expect(buildMetricsInfoQuery('FROM metrics-* | LIMIT 100 | SORT timestamp DESC')).toBe(
      'FROM metrics-* | METRICS_INFO | LIMIT 100'
    );

    expect(buildMetricsInfoQuery('FROM metrics-* | SORT timestamp DESC | LIMIT 100 ')).toBe(
      'FROM metrics-* | METRICS_INFO | LIMIT 100'
    );

    expect(
      buildMetricsInfoQuery(
        'FROM metrics-* | SORT timestamp DESC | LIMIT 100 | WHERE timestamp > now-1h',
        'MV_CONTAINS(dimension_fields, "environment")'
      )
    ).toBe(
      'FROM metrics-* | WHERE timestamp > now - 1h | METRICS_INFO | WHERE MV_CONTAINS(dimension_fields, "environment") | LIMIT 100'
    );
  });

  it('does not add a pre-METRICS_INFO presence filter', () => {
    expect(buildMetricsInfoQuery('TS INDEX | WHERE region == eu')).toBe(
      'TS INDEX | WHERE region == eu | METRICS_INFO'
    );
    expect(buildMetricsInfoQuery('TS INDEX | WHERE region == eu', '')).toBe(
      'TS INDEX | WHERE region == eu | METRICS_INFO'
    );
  });
});
