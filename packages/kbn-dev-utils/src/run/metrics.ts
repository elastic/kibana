/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import normalizePath from 'normalize-path';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { ToolingLog } from '@kbn/tooling-log';

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

    // standardize to unix path
    this.filePath = normalizePath(path.relative(REPO_ROOT, process.argv[1]).replace('.js', ''));
  }

  createTiming(meta: object, command?: string) {
    return {
      group: `${command ? `${this.filePath} ${command}` : this.filePath}`,
      id: 'total',
      ms: Date.now() - this.startTime,
      meta: {
        nestedTiming: process.env.CI_STATS_NESTED_TIMING,
        ...Object.fromEntries(this.meta),
        ...meta,
      },
    };
  }

  async reportCancelled(command?: string) {
    return await this.reporter.timings({
      timings: [this.createTiming({ cancelled: true }, command)],
    });
  }

  async reportSuccess(command?: string) {
    return await this.reporter.timings({
      timings: [this.createTiming({ success: true }, command)],
    });
  }

  async reportError(errorMessage?: string, command?: string) {
    return await this.reporter.timings({
      timings: [this.createTiming({ success: false, errorMessage }, command)],
    });
  }
}
