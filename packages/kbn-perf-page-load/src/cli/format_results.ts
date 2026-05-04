/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface PageMetrics {
  performanceScore: number | null;
  fcpMs: number;
  lcpMs: number;
  tbtMs: number;
  clsScore: number;
  siMs: number;
  ttiMs: number;
  firstAppNav?: number;
  bootstrapStarted?: number;
}

type Results = Record<string, PageMetrics>;

const METRIC_LABELS: Array<{ key: keyof PageMetrics; label: string; unit: string }> = [
  { key: 'performanceScore', label: 'Perf Score', unit: '' },
  { key: 'fcpMs', label: 'FCP', unit: ' ms' },
  { key: 'lcpMs', label: 'LCP', unit: ' ms' },
  { key: 'tbtMs', label: 'TBT', unit: ' ms' },
  { key: 'siMs', label: 'Speed Index', unit: ' ms' },
  { key: 'ttiMs', label: 'TTI', unit: ' ms' },
  { key: 'clsScore', label: 'CLS', unit: '' },
  { key: 'firstAppNav', label: 'first_app_nav', unit: ' ms' },
  { key: 'bootstrapStarted', label: 'bootstrap_started', unit: ' ms' },
];

const pad = (s: string, w: number) => s.padStart(w);

/** When baseline is 0, percent change is undefined; use a small floor so delta stays finite and comparable to --threshold. */
const BASELINE_EPS_MS = 1;
const BASELINE_EPS_CLS = 0.01;

function baselineEpsWhenZero(key: keyof PageMetrics): number {
  return key === 'clsScore' ? BASELINE_EPS_CLS : BASELINE_EPS_MS;
}

export const formatSingleResults = (results: Results): string => {
  const pages = Object.keys(results);
  if (pages.length === 0) return 'No results.';

  const colWidth = 18;
  const metricWidth = 20;

  const header = `| ${'Metric'.padEnd(metricWidth)} | ${pages
    .map((p) => pad(p, colWidth))
    .join(' | ')} |`;
  const separator = `|${'-'.repeat(metricWidth + 2)}|${pages
    .map(() => '-'.repeat(colWidth + 2))
    .join('|')}|`;

  const rows = METRIC_LABELS.map(({ key, label, unit }) => {
    const values = pages.map((p) => {
      const v = results[p][key];
      if (v === undefined || v === null) return pad('—', colWidth);
      if (key === 'performanceScore') return pad(String(Math.round((v as number) * 100)), colWidth);
      return pad(`${v}${unit}`, colWidth);
    });
    return `| ${label.padEnd(metricWidth)} | ${values.join(' | ')} |`;
  });

  return [separator, header, separator, ...rows, separator].join('\n');
};

export const formatComparisonResults = (
  label1: string,
  results1: Results,
  label2: string,
  results2: Results,
  threshold: number
): { table: string; regressions: string[] } => {
  const pages = [...new Set([...Object.keys(results1), ...Object.keys(results2)])];
  const regressions: string[] = [];

  const tables = pages.map((page) => {
    const m1 = results1[page];
    const m2 = results2[page];
    if (!m1 || !m2) return `  ${page}: missing in one of the results\n`;

    const colWidth = 14;
    const metricWidth = 20;

    const header = `| ${'Metric'.padEnd(metricWidth)} | ${pad(label1, colWidth)} | ${pad(
      label2,
      colWidth
    )} | ${pad('Delta', colWidth)} |`;
    const sep = `|${'-'.repeat(metricWidth + 2)}|${'-'.repeat(colWidth + 2)}|${'-'.repeat(
      colWidth + 2
    )}|${'-'.repeat(colWidth + 2)}|`;

    const rows = METRIC_LABELS.map(({ key, label, unit }) => {
      const v1 = m1[key];
      const v2 = m2[key];
      if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
        return `| ${label.padEnd(metricWidth)} | ${pad('—', colWidth)} | ${pad(
          '—',
          colWidth
        )} | ${pad('—', colWidth)} |`;
      }

      const n1 = key === 'performanceScore' ? Math.round((v1 as number) * 100) : (v1 as number);
      const n2 = key === 'performanceScore' ? Math.round((v2 as number) * 100) : (v2 as number);

      let delta: number;
      if (key === 'performanceScore') {
        delta = n1 === 0 ? (n2 === 0 ? 0 : 100) : ((n2 - n1) / Math.abs(n1)) * 100;
      } else if (n1 === 0 && n2 === 0) {
        delta = 0;
      } else {
        const base = n1 === 0 ? baselineEpsWhenZero(key) : Math.abs(n1);
        delta = ((n2 - n1) / base) * 100;
      }
      const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;

      // For scores, higher is better (regression = decrease). For timings, lower is better (regression = increase).
      const isScoreMetric = key === 'performanceScore';
      const isRegression = isScoreMetric ? delta < -threshold : delta > threshold;

      if (isRegression) {
        regressions.push(`${page}/${label}: ${deltaStr}`);
      }

      return `| ${label.padEnd(metricWidth)} | ${pad(`${n1}${unit}`, colWidth)} | ${pad(
        `${n2}${unit}`,
        colWidth
      )} | ${pad(deltaStr, colWidth)} |`;
    });

    return `\n  ${page}:\n${[sep, header, sep, ...rows, sep].join('\n')}`;
  });

  return { table: tables.join('\n'), regressions };
};
