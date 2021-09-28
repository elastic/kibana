/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { CiStatsReporter } from '../ci_stats_reporter';
import { ToolingLog } from '../tooling_log';

export type MetricsMeta = Map<string, string | boolean | number>;

export class Metrics {
  private reporter: CiStatsReporter;
  meta: MetricsMeta = new Map();
  startTime: number;
  filePath: string;

  constructor(log: ToolingLog) {
    this.reporter = CiStatsReporter.fromEnv(log);
    this.meta = new Map();
    this.startTime = Date.now();
    this.filePath = path.relative(REPO_ROOT, process.argv[1]).replace('.js', '');
  }

  async reportSuccess(command?: string) {
    return await this.reporter.timings({
      timings: [
        {
          group: `${command ? `${this.filePath} ${command}` : this.filePath}`,
          id: 'total',
          ms: Date.now() - this.startTime,
          meta: {
            success: true,
            ...Object.fromEntries(this.meta),
          },
        },
      ],
    });
  }

  async reportError(command?: string) {
    return await this.reporter.timings({
      timings: [
        {
          group: `${command ? `${this.filePath} ${command}` : this.filePath}`,
          id: 'total',
          ms: Date.now() - this.startTime,
          meta: {
            success: false,
            ...Object.fromEntries(this.meta),
          },
        },
      ],
    });
  }
}
