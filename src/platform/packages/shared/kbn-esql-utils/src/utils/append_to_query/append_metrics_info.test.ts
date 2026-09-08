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
    expect(buildMetricsInfoQuery('TS INDEX')).toBe(`TS INDEX\n | METRICS_INFO`);
  });

  it('returns query as-is when METRICS_INFO is already in the pipeline', () => {
    const simpleQuery = 'TS INDEX | METRICS_INFO';
    expect(buildMetricsInfoQuery(simpleQuery)).toBe(simpleQuery);
    const withLimit = 'TS INDEX | METRICS_INFO | LIMIT 100';
    expect(buildMetricsInfoQuery(withLimit)).toBe(withLimit);
  });

  it('does not inject a postFilter when METRICS_INFO is already user-authored', () => {
    const userQuery = 'TS INDEX | METRICS_INFO';
    expect(
      buildMetricsInfoQuery(userQuery, {
        postFilter: 'MV_CONTAINS(dimension_fields, "environment")',
      })
    ).toBe(userQuery);
  });

  it('appends a caller-supplied postFilter after METRICS_INFO', () => {
    expect(
      buildMetricsInfoQuery('TS INDEX', {
        postFilter: 'MV_CONTAINS(dimension_fields, "environment")',
      })
    ).toBe(`TS INDEX\n | METRICS_INFO | WHERE MV_CONTAINS(dimension_fields, "environment")`);
  });

  it('ignores an empty postFilter', () => {
    expect(buildMetricsInfoQuery('TS INDEX', { postFilter: '' })).toBe(`TS INDEX\n | METRICS_INFO`);
    expect(buildMetricsInfoQuery('TS INDEX', {})).toBe(`TS INDEX\n | METRICS_INFO`);
  });

  it('does not inherit the document LIMIT onto the catalog query', () => {
    expect(buildMetricsInfoQuery('TS INDEX | LIMIT 10')).toBe(`TS INDEX\n | METRICS_INFO`);
    expect(buildMetricsInfoQuery('TS INDEX | LIMIT 10', { postFilter: 'foo == 1' })).toBe(
      `TS INDEX\n | METRICS_INFO | WHERE foo == 1`
    );
  });

  it('returns empty string for query with transformational command', () => {
    expect(buildMetricsInfoQuery('FROM x | STATS count()')).toBe('');
    expect(buildMetricsInfoQuery('TS x | STATS count()')).toBe('');
  });

  it('returns empty string for non-TS source command', () => {
    expect(buildMetricsInfoQuery('FROM metrics-*')).toBe('');
    expect(buildMetricsInfoQuery('FROM metrics-* | LIMIT 100')).toBe('');
  });

  it('removes SORT from the query', () => {
    expect(buildMetricsInfoQuery('TS metrics-* | LIMIT 100 | SORT timestamp DESC')).toBe(
      `TS metrics-*\n | METRICS_INFO`
    );

    expect(buildMetricsInfoQuery('TS metrics-* | SORT timestamp DESC | LIMIT 100')).toBe(
      `TS metrics-*\n | METRICS_INFO`
    );

    expect(
      buildMetricsInfoQuery(
        'TS metrics-* | SORT timestamp DESC | LIMIT 100 | WHERE timestamp > now-1h',
        {
          postFilter: 'MV_CONTAINS(dimension_fields, "environment")',
        }
      )
    ).toBe(
      `TS metrics-* | WHERE timestamp > now - 1h\n | METRICS_INFO | WHERE MV_CONTAINS(dimension_fields, "environment")`
    );
  });
});
