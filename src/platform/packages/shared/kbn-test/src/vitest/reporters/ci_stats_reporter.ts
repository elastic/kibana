/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';

import type { Reporter, TestModule } from 'vitest/node';
import type { CiStatsReportTestsOptions } from '@kbn/ci-stats-reporter';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';

import { getModuleResults } from './test_module_results';

/**
 * Reports one test group per config (plus shard) to CI Stats, matching the Jest reporter so
 * pick_test_group_run_order can balance Vitest configs by their recorded durations.
 */
export class KbnCiStatsReporter implements Reporter {
  private readonly reportName: string;
  private reporter: CiStatsReporter | undefined;
  private startTime = Date.now();

  constructor(private readonly testGroupType: string, configPath: string, shard?: string) {
    this.reportName = shard ? `${configPath}||shard=${shard}` : configPath;
  }

  onTestRunStart() {
    const reporter = CiStatsReporter.fromEnv(
      new ToolingLog({ level: 'info', writeTo: process.stdout })
    );
    if (!reporter.hasBuildConfig()) {
      return;
    }
    this.reporter = reporter;
    this.startTime = Date.now();
  }

  async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    if (!this.reporter) {
      return;
    }

    const testRuns: CiStatsReportTestsOptions['testRuns'] = [];
    let failed = false;
    let passed = false;

    for (const testModule of testModules) {
      const { cases, moduleErrors } = getModuleResults(testModule);
      const file = relative(REPO_ROOT, testModule.moduleId);
      if (moduleErrors.length) {
        // A file that failed to load has no test cases; report it as one failing run.
        failed = true;
        testRuns.push({
          startTime: new Date(this.startTime).toJSON(),
          durationMs: testModule.diagnostic().duration,
          seq: testRuns.length + 1,
          file,
          name: 'Test suite failed to run',
          result: 'fail',
          suites: [],
          type: 'test',
          error: moduleErrors.join('\n\n'),
        });
      }
      for (const { suites, title, status, durationMs, startTime, failureMessages } of cases) {
        const result = status === 'failed' ? 'fail' : status === 'passed' ? 'pass' : 'skip';
        failed ||= result === 'fail';
        passed ||= result === 'pass';
        testRuns.push({
          startTime: new Date(startTime).toJSON(),
          durationMs,
          seq: testRuns.length + 1,
          file,
          // CI Stats rejects empty names, which Vitest allows (e.g. `it('')`, `it.each` without titles)
          name: title || suites.at(-1) || file,
          result,
          suites,
          type: 'test',
          error: failureMessages.join('\n\n'),
        });
      }
    }

    await this.reporter.reportTests({
      group: {
        name: this.reportName,
        type: this.testGroupType,
        startTime: new Date(this.startTime).toJSON(),
        meta: {},
        durationMs: Date.now() - this.startTime,
        result: failed ? 'fail' : passed ? 'pass' : 'skip',
      },
      testRuns,
    });
  }
}
