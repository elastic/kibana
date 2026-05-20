/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatSingleResults, formatComparisonResults } from './format_results';

const fullMetrics = {
  performanceScore: 0.85,
  fcpMs: 1200,
  lcpMs: 2400,
  tbtMs: 300,
  clsScore: 0.05,
  siMs: 1800,
  ttiMs: 3000,
  firstAppNav: 500,
  bootstrapStarted: 100,
};

describe('formatSingleResults', () => {
  it('returns "No results." for empty results', () => {
    expect(formatSingleResults({})).toBe('No results.');
  });

  it('contains all metric labels in the output table', () => {
    const result = formatSingleResults({ dashboard: fullMetrics });
    expect(result).toContain('Perf Score');
    expect(result).toContain('FCP');
    expect(result).toContain('LCP');
    expect(result).toContain('TBT');
    expect(result).toContain('CLS');
    expect(result).toContain('Speed Index');
    expect(result).toContain('TTI');
    expect(result).toContain('first_app_nav');
    expect(result).toContain('bootstrap_started');
  });

  it('scales performanceScore by Math.round(v * 100)', () => {
    const result = formatSingleResults({ page: fullMetrics });
    expect(result).toContain('85');
  });

  it('shows em-dash for null/undefined optional fields', () => {
    const metrics = { ...fullMetrics, firstAppNav: undefined, bootstrapStarted: undefined };
    const result = formatSingleResults({ page: metrics as any });
    const lines = result.split('\n');
    const firstAppNavLine = lines.find((l) => l.includes('first_app_nav'));
    expect(firstAppNavLine).toContain('—');
    const bootstrapLine = lines.find((l) => l.includes('bootstrap_started'));
    expect(bootstrapLine).toContain('—');
  });

  it('shows em-dash for null performanceScore', () => {
    const metrics = { ...fullMetrics, performanceScore: null };
    const result = formatSingleResults({ page: metrics });
    const lines = result.split('\n');
    const perfLine = lines.find((l) => l.includes('Perf Score'));
    expect(perfLine).toContain('—');
  });
});

describe('formatComparisonResults', () => {
  it('reports pages missing in one of the results', () => {
    const r1 = { pageA: fullMetrics };
    const r2 = { pageB: fullMetrics };
    const { table } = formatComparisonResults('base', r1, 'pr', r2, 10);
    expect(table).toContain('pageA: missing in one of the results');
    expect(table).toContain('pageB: missing in one of the results');
  });

  it('calculates delta as (n2 - n1) / |n1| * 100', () => {
    const r1 = { page: { ...fullMetrics, fcpMs: 1000 } };
    const r2 = { page: { ...fullMetrics, fcpMs: 1200 } };
    const { table } = formatComparisonResults('base', r1, 'pr', r2, 50);
    expect(table).toContain('+20.0%');
  });

  it('uses baseline EPS when baseline is zero so delta matches --threshold (ms metrics)', () => {
    const r1 = { page: { ...fullMetrics, tbtMs: 0 } };
    const r2 = { page: { ...fullMetrics, tbtMs: 500 } };
    const { table, regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    const lines = table.split('\n');
    const tbtLine = lines.find((l) => l.includes('TBT'));
    expect(tbtLine).toContain('+50000.0%');
    expect(regressions.some((r) => r.includes('TBT'))).toBe(true);
  });

  it('reports 0% delta when both baselines are zero (ms / non-score)', () => {
    const r1 = { page: { ...fullMetrics, tbtMs: 0 } };
    const r2 = { page: { ...fullMetrics, tbtMs: 0 } };
    const { table, regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    const lines = table.split('\n');
    const tbtLine = lines.find((l) => l.includes('TBT'));
    expect(tbtLine).toContain('+0.0%');
    expect(regressions.some((r) => r.includes('TBT'))).toBe(false);
  });

  it('uses baseline EPS for CLS when baseline is zero', () => {
    const r1 = { page: { ...fullMetrics, clsScore: 0 } };
    const r2 = { page: { ...fullMetrics, clsScore: 0.05 } };
    const { table, regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    const lines = table.split('\n');
    const clsLine = lines.find((l) => l.includes('CLS'));
    expect(clsLine).toContain('+500.0%');
    expect(regressions.some((r) => r.includes('CLS'))).toBe(true);
  });

  it('detects regression when timing increase exceeds threshold', () => {
    const r1 = { page: { ...fullMetrics, fcpMs: 1000 } };
    const r2 = { page: { ...fullMetrics, fcpMs: 1500 } };
    const { regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    expect(regressions.some((r) => r.includes('FCP'))).toBe(true);
  });

  it('detects regression when performance score decreases beyond threshold', () => {
    const r1 = { page: { ...fullMetrics, performanceScore: 0.9 } };
    const r2 = { page: { ...fullMetrics, performanceScore: 0.5 } };
    const { regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    expect(regressions.some((r) => r.includes('Perf Score'))).toBe(true);
  });

  it('does not flag regression when delta is exactly at threshold (strict inequality)', () => {
    // For timing metric: delta = +10% with threshold = 10 -> delta > threshold is false
    const r1 = { page: { ...fullMetrics, fcpMs: 1000 } };
    const r2 = { page: { ...fullMetrics, fcpMs: 1100 } };
    const { regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    expect(regressions.some((r) => r.includes('FCP'))).toBe(false);
  });

  it('shows em-dash columns when values are null', () => {
    const r1 = { page: { ...fullMetrics, firstAppNav: undefined } };
    const r2 = { page: { ...fullMetrics, firstAppNav: undefined } };
    const { table } = formatComparisonResults('base', r1 as any, 'pr', r2 as any, 10);
    const lines = table.split('\n');
    const firstAppNavLine = lines.find((l) => l.includes('first_app_nav'));
    expect(firstAppNavLine).toContain('—');
  });

  it('returns no regressions when values improve', () => {
    const r1 = { page: { ...fullMetrics, fcpMs: 2000 } };
    const r2 = { page: { ...fullMetrics, fcpMs: 1000 } };
    const { regressions } = formatComparisonResults('base', r1, 'pr', r2, 10);
    expect(regressions.filter((r) => r.includes('FCP'))).toHaveLength(0);
  });
});
