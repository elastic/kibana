/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildMetricsInfoQuery,
  injectDimensionFilterIntoMetricsInfoQuery,
} from './append_metrics_info';

describe('buildMetricsInfoQuery', () => {
  it('returns empty string for empty or undefined esql', () => {
    expect(buildMetricsInfoQuery('')).toBe('');
    expect(buildMetricsInfoQuery(undefined)).toBe('');
    expect(buildMetricsInfoQuery('   ')).toBe('');
  });

  it('appends | METRICS_INFO when no dimension filter', () => {
    expect(buildMetricsInfoQuery('FROM metrics-*')).toBe('FROM metrics-* | METRICS_INFO');
    expect(buildMetricsInfoQuery('TS INDEX')).toBe('TS INDEX | METRICS_INFO');
  });

  it('returns query as-is when it already ends with METRICS_INFO and no dimension filter', () => {
    const query = 'TS INDEX | METRICS_INFO';
    expect(buildMetricsInfoQuery(query)).toBe(query);
  });

  it('does not add dimension filter when dimensionFieldNames is empty or single', () => {
    expect(buildMetricsInfoQuery('TS INDEX', [])).toBe('TS INDEX | METRICS_INFO');
    expect(buildMetricsInfoQuery('TS INDEX', ['environment'])).toBe('TS INDEX | METRICS_INFO');
  });

  it('injects WHERE dimension filter when multiple dimension names', () => {
    expect(buildMetricsInfoQuery('TS INDEX', ['environment', 'station.name'])).toBe(
      'TS INDEX | WHERE environment IS NOT NULL OR station.name IS NOT NULL | METRICS_INFO'
    );
  });

  it('combines with existing WHERE via AND when multiple dimensions', () => {
    expect(
      buildMetricsInfoQuery("TS INDEX | WHERE region = 'eu'", ['environment', 'station.name'])
    ).toBe(
      "TS INDEX | WHERE region = 'eu' AND (environment IS NOT NULL OR station.name IS NOT NULL) | METRICS_INFO"
    );
  });

  it('returns empty string for query with transformational command', () => {
    expect(buildMetricsInfoQuery('FROM x | STATS count()')).toBe('');
    expect(buildMetricsInfoQuery('FROM x | STATS count()', ['a', 'b'])).toBe('');
  });
});

describe('injectDimensionFilterIntoMetricsInfoQuery', () => {
  it('returns query unchanged when dimension list is empty', () => {
    expect(injectDimensionFilterIntoMetricsInfoQuery('TS INDEX', [])).toBe('TS INDEX');
  });

  it('adds WHERE clause when query has no WHERE', () => {
    expect(
      injectDimensionFilterIntoMetricsInfoQuery('TS INDEX', ['environment', 'station.name'])
    ).toBe('TS INDEX | WHERE environment IS NOT NULL OR station.name IS NOT NULL');
  });

  it('appends AND (predicate) when query has existing WHERE', () => {
    expect(
      injectDimensionFilterIntoMetricsInfoQuery("TS INDEX | WHERE region = 'eu'", [
        'environment',
        'station.name',
      ])
    ).toBe(
      "TS INDEX | WHERE region = 'eu' AND (environment IS NOT NULL OR station.name IS NOT NULL)"
    );
  });

  it('handles dotted dimension names', () => {
    expect(
      injectDimensionFilterIntoMetricsInfoQuery('FROM metrics-*', [
        'host.name',
        'kubernetes.pod.name',
      ])
    ).toBe('FROM metrics-* | WHERE host.name IS NOT NULL OR kubernetes.pod.name IS NOT NULL');
  });
});
