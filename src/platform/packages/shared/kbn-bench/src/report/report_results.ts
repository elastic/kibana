/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { table } from 'table';
import type { ConfigResult } from '../runner/types';
import { formatDuration, summarizeBenchmark } from './report_utils';
import { getTableConfig } from './get_table_config';

export function reportResults(results: ConfigResult[]) {
  const lines: string[] = [];

  if (!results.length) {
    lines.push('No benchmark results to report');
  }

  for (const configResult of results) {
    lines.push('');
    lines.push(`${chalk.bold.cyan('Benchmark config:')} ${configResult.config.name}`);

    for (const benchResult of configResult.benchmarks) {
      const s = summarizeBenchmark(benchResult);

      const statusPart = s.failed
        ? chalk.red(` (fail ${s.failed}/${s.completed + s.failed})`)
        : chalk.dim(` (${s.completed} run${s.completed === 1 ? '' : 's'})`);
      const title = `${chalk.bold(s.name)}${statusPart}`;
      lines.push(title);

      const metricKeys = Object.keys(s.metrics).sort();
      const header = [chalk.bold('Metric'), chalk.bold('Avg'), chalk.bold('Std Dev')];
      const rows: string[][] = [];

      rows.push([
        'Time',
        s.time.avg != null ? chalk.yellow(formatDuration(s.time.avg)) : '—',
        s.time.stdDev != null ? chalk.dim(formatDuration(s.time.stdDev)) : '—',
      ]);

      for (const key of metricKeys) {
        const metric = s.metrics[key];
        rows.push([
          key,
          metric?.summary.avg != null ? chalk.cyan(metric.summary.avg.toFixed(2)) : '—',
          metric?.summary.stdDev != null ? chalk.dim(metric.summary.stdDev.toFixed(2)) : '—',
        ]);
      }

      const tbl = table([header, ...rows], getTableConfig());

      lines.push(...tbl.split('\n'));
    }
  }
  return lines.join('\n').trim();
}
