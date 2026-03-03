/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Path from 'path';

import getopts from 'getopts';
import type { CiStatsReportTestsOptions } from '@kbn/ci-stats-reporter';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { ToolingLog } from '@kbn/tooling-log';
import type { Config } from '@jest/types';
import type { Test, TestResult } from '@jest/reporters';
import { BaseReporter } from '@jest/reporters';
import type { ConsoleBuffer } from '@jest/console';

type LogEntry = ConsoleBuffer[0];

interface ReporterOptions {
  testGroupType: string;
}

function formatConsoleLine({ type, message, origin }: LogEntry) {
  const originLines = origin.split('\n');

  return `console.${type}: ${message}${originLines[0] ? `\n  ${originLines[0]}` : ''}`;
}

/**
 * Jest reporter that reports tests to CI Stats
 * @class JestJUnitReporter
 */

// eslint-disable-next-line import/no-default-export
export default class CiStatsJestReporter extends BaseReporter {
  private reporter: CiStatsReporter | undefined;
  private readonly testGroupType: string;
  private readonly reportName: string;
  private readonly rootDir: string;
  private startTime: number | undefined;
  private passCount = 0;
  private failCount = 0;
  private testExecErrorCount = 0;

  private group: CiStatsReportTestsOptions['group'] | undefined;
  private readonly testRuns: CiStatsReportTestsOptions['testRuns'] = [];

  constructor(config: Config.GlobalConfig, options: ReporterOptions) {
    super();

    this.rootDir = config.rootDir;
    this.testGroupType = options?.testGroupType;
    if (!this.testGroupType) {
      throw new Error('missing testGroupType reporter option');
    }

    const argv = getopts(process.argv);
    const configArg = argv.config;
    if (typeof configArg !== 'string') {
      throw new Error('expected to find a single --config arg');
    }

    // When running with --shard (e.g., --shard=1/2), include the shard annotation
    // in the report name so ci-stats tracks durations per shard independently.
    // This matches the annotated names produced by pick_test_group_run_order.ts
    // (e.g., "config.js||shard=1/2").
    const shardArg = argv.shard;
    this.reportName = typeof shardArg === 'string' ? `${configArg}||shard=${shardArg}` : configArg;
  }

  async onRunStart() {
    const reporter = CiStatsReporter.fromEnv(
      new ToolingLog({
        level: 'info',
        writeTo: process.stdout,
      })
    );

    if (!reporter.hasBuildConfig()) {
      return;
    }

    this.startTime = Date.now();
    this.reporter = reporter;
    this.group = {
      name: this.reportName,
      type: this.testGroupType,
      startTime: new Date(this.startTime).toJSON(),
      meta: {},
      durationMs: 0,
      result: 'skip',
    };
  }

  async onTestFileResult(_: Test, testResult: TestResult) {
    if (!this.reporter || !this.group) {
      return;
    }

    if (testResult.testExecError) {
      this.testExecErrorCount += 1;
    }

    let elapsedTime = 0;
    for (const t of testResult.testResults) {
      const result = t.status === 'failed' ? 'fail' : t.status === 'passed' ? 'pass' : 'skip';

      if (result === 'fail') {
        this.failCount += 1;
      } else if (result === 'pass') {
        this.passCount += 1;
      }

      const startTime = new Date(testResult.perfStats.start + elapsedTime).toJSON();
      elapsedTime += t.duration ?? 0;
      this.testRuns.push({
        startTime,
        durationMs: t.duration ?? 0,
        seq: this.testRuns.length + 1,
        file: Path.relative(this.rootDir, testResult.testFilePath),
        name: t.title,
        result,
        suites: t.ancestorTitles,
        type: 'test',
        error: t.failureMessages.join('\n\n'),
        stdout: testResult.console?.map(formatConsoleLine).join('\n'),
      });
    }
  }

  async onRunComplete() {
    if (!this.reporter || !this.group || !this.startTime) {
      return;
    }

    this.group.durationMs = Date.now() - this.startTime;
    this.group.result =
      this.failCount || this.testExecErrorCount ? 'fail' : this.passCount ? 'pass' : 'skip';

    await this.reporter.reportTests({
      group: this.group,
      testRuns: this.testRuns,
    });
  }
}
