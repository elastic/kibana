/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { maybe } from '@kbn/std';
import chalk from 'chalk';
import { keyBy, uniq } from 'lodash';
import { table } from 'table';
import type { ConfigResult } from '../runner/types';
import { getTableConfig } from './get_table_config';
import type { BenchmarkSummary, MetricSummary } from './report_utils';
import { formatDuration, formatNumber, summarizeBenchmark } from './report_utils';

interface ResultSet {
  name: string;
  results: ConfigResult[];
}

// Calculate delta. If right is 100, and left is 150, this will show 50/50%
function calcDelta(left: number | null, right: number | null) {
  if (left == null || right == null) return null;
  const diff = left - right;
  const pct = left === 0 ? 0 : (diff / left) * 100;
  return { diff, pct };
}

function getStatus(left?: BenchmarkSummary, right?: BenchmarkSummary) {
  if (!left) return chalk.green('added');
  if (!right) return chalk.red('removed');
  return '-';
}

// Format and colorize a previously computed delta. Lower values are better unless invert is true.
function colorDelta(delta: ReturnType<typeof calcDelta>, invert = false) {
  if (!delta) return '—';
  const { diff, pct } = delta;
  const sign = diff === 0 ? '' : diff > 0 ? '+' : '';
  const formatted = `${sign}${diff.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`;
  if (diff === 0) return chalk.dim(formatted);
  const improved = invert ? diff > 0 : diff < 0;
  return improved ? chalk.green(formatted) : chalk.red(formatted);
}

function getMetricRowFactory(
  formatter: (value: number) => string,
  left?: MetricSummary,
  right?: MetricSummary
): (label: string, prop: keyof MetricSummary) => [string, string, string] {
  return function getRow(label: string, prop: keyof MetricSummary) {
    const leftVal = left ? left[prop] : null;
    const rightVal = right ? right[prop] : null;

    const leftStr = leftVal != null ? formatter(leftVal) : '—';
    const rightStr = rightVal != null ? formatter(rightVal) : '—';
    const delta = calcDelta(leftVal, rightVal); // compute raw delta
    return [label, `${leftStr} -> ${rightStr}`, colorDelta(delta)];
  };
}

function getRunSummary(left?: BenchmarkSummary) {
  if (!left) return '';
  const total = left.completed + left.failed;
  if (left.failed) {
    return chalk.red(` ${left.failed}/${total} failed`);
  }
  return chalk.dim(` ${total} run${total === 1 ? '' : 's'}`);
}

function renderBenchmarkDiff(
  left?: { name: string; result: ConfigResult },
  right?: { name: string; result: ConfigResult }
) {
  // Map benchmark name -> summary

  const leftBenchmarkResultsByName = keyBy(
    left?.result.benchmarks,
    (benchmarkResult) => benchmarkResult.benchmark.name
  );

  const rightBenchmarkResultsByName = keyBy(
    right?.result.benchmarks,
    (benchmarkResult) => benchmarkResult.benchmark.name
  );

  const allNames = uniq([
    ...Object.keys(leftBenchmarkResultsByName),
    ...Object.keys(rightBenchmarkResultsByName),
  ]);

  for (const name of allNames) {
    const leftBenchmarkResult = maybe(leftBenchmarkResultsByName[name]);
    const rightBenchmarkResult = maybe(rightBenchmarkResultsByName[name]);

    const leftSummary = leftBenchmarkResult ? summarizeBenchmark(leftBenchmarkResult) : undefined;
    const rightSummary = rightBenchmarkResult
      ? summarizeBenchmark(rightBenchmarkResult)
      : undefined;

    const status = getStatus(leftSummary, rightSummary);

    const rows: string[][] = [];

    const getTimeRow = getMetricRowFactory(formatDuration, leftSummary?.time, rightSummary?.time);

    rows.push(getTimeRow('Avg Time', 'avg'));
    rows.push(getTimeRow('Std dev', 'stdDev'));

    const leftMetrics = leftSummary?.metrics;
    const rightMetrics = rightSummary?.metrics;

    const allMetricKeys = uniq([
      ...Object.keys(leftMetrics ?? {}),
      ...Object.keys(rightMetrics ?? {}),
    ]);

    for (const metricKey of allMetricKeys) {
      const leftMetric = leftSummary?.metrics[metricKey];
      const rightMetric = leftSummary?.metrics[metricKey];

      const getMetricRow = getMetricRowFactory(
        formatNumber,
        leftMetric?.summary,
        rightMetric?.summary
      );

      rows.push(getMetricRow(`${metricKey}`, 'avg'));
      rows.push(getMetricRow(`${metricKey} (σ)`, 'stdDev'));
    }

    const runInfo = getRunSummary(leftSummary);

    const nameCol = `${name}${runInfo} ${chalk.dim(`[${status}]`)}`;
    const header = [
      chalk.bold(nameCol),
      chalk.bold(`${left?.name ?? right?.name}`),
      chalk.bold('Δ'),
    ];

    const output = table([header, ...rows], getTableConfig());

    return output.split('\n');
  }
}

export function reportDiff(left: ResultSet, right: ResultSet) {
  const lines: string[] = [];

  lines.push('');

  lines.push(chalk.bold.cyan(`Benchmark diff: ${left.name} -> ${right.name}`));

  const leftConfigs = keyBy(left.results, (res) => res.config.name);

  const rightConfigs = keyBy(right.results, (res) => res.config.name);

  const allNames = uniq(Object.keys(leftConfigs).concat(Object.keys(rightConfigs)));

  for (const configName of allNames) {
    const leftCfg = maybe(leftConfigs[configName]);
    const rightCfg = maybe(rightConfigs[configName]);

    lines.push(chalk.bold(`Config: ${configName}`));

    const rendered = renderBenchmarkDiff(
      leftCfg
        ? {
            name: left.name,
            result: leftCfg,
          }
        : undefined,
      rightCfg
        ? {
            name: right.name,
            result: rightCfg,
          }
        : undefined
    );

    if (rendered) {
      lines.push(...rendered, '');
    }
  }

  return lines.join('\n').trim();
}
