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
  it('should append | METRICS_INFO to a valid non-transformational TS query', () => {
    const esql = 'TS metrics-* | WHERE cloud.availability_zone IS NOT NULL';
    expect(buildMetricsInfoQuery(esql)).toBe(
      'TS metrics-* | WHERE cloud.availability_zone IS NOT NULL | METRICS_INFO'
    );
  });

  it('should append | METRICS_INFO to a simple TS query', () => {
    const esql = 'TS metrics-*';
    expect(buildMetricsInfoQuery(esql)).toBe('TS metrics-* | METRICS_INFO');
  });

  it('should append | METRICS_INFO to FROM query with WHERE', () => {
    const esql = 'FROM metrics-* | WHERE x > 0';
    expect(buildMetricsInfoQuery(esql)).toBe('FROM metrics-* | WHERE x > 0 | METRICS_INFO');
  });

  it('should return empty string for query with transformational command (stats)', () => {
    const esql = 'TS metrics-* | STATS count() BY host';
    expect(buildMetricsInfoQuery(esql)).toBe('');
  });

  it('should return empty string for query with transformational command (keep)', () => {
    const esql = 'FROM a | KEEP field1, field2';
    expect(buildMetricsInfoQuery(esql)).toBe('');
  });

  it('should not double-append when query already ends with METRICS_INFO', () => {
    const esql = 'TS metrics-* | WHERE x IS NOT NULL | METRICS_INFO';
    expect(buildMetricsInfoQuery(esql)).toBe(esql);
  });

  it('should not double-append when query already contains metrics_info at end', () => {
    const esql = 'TS metrics-* | metrics_info';
    expect(buildMetricsInfoQuery(esql)).toBe(esql);
  });

  it('should return empty string for empty input', () => {
    expect(buildMetricsInfoQuery('')).toBe('');
    expect(buildMetricsInfoQuery('   ')).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(buildMetricsInfoQuery(undefined)).toBe('');
  });

  it('should trim input before appending', () => {
    const esql = '  TS metrics-* | WHERE x IS NOT NULL  ';
    expect(buildMetricsInfoQuery(esql)).toBe('TS metrics-* | WHERE x IS NOT NULL | METRICS_INFO');
  });
});
