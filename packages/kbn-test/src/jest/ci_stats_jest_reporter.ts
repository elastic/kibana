/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Path from 'path';

import getopts from 'getopts';
import { CiStatsReporter, CiStatsReportTestsOptions } from '@kbn/ci-stats-reporter';
import { ToolingLog } from '@kbn/tooling-log';
import type { Config } from '@jest/types';
import { BaseReporter, Test, TestResult } from '@jest/reporters';
import { ConsoleBuffer } from '@jest/console';

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

  private group: CiStatsReportTestsOptions['group'] | undefined;
  private readonly testRuns: CiStatsReportTestsOptions['testRuns'] = [];

  constructor(config: Config.GlobalConfig, options: ReporterOptions) {
    super();

    this.rootDir = config.rootDir;
    this.testGroupType = options?.testGroupType;
    if (!this.testGroupType) {
      throw new Error('missing testGroupType reporter option');
    }

    const configArg = getopts(process.argv).config;
    if (typeof configArg !== 'string') {
      throw new Error('expected to find a single --config arg');
    }
    this.reportName = configArg;
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
    };
  }

  async onTestFileResult(_: Test, testResult: TestResult) {
    if (!this.reporter || !this.group) {
      return;
    }

    let elapsedTime = 0;
    for (const t of testResult.testResults) {
      const startTime = new Date(testResult.perfStats.start + elapsedTime).toJSON();
      elapsedTime += t.duration ?? 0;
      this.testRuns.push({
        startTime,
        durationMs: t.duration ?? 0,
        seq: this.testRuns.length + 1,
        file: Path.relative(this.rootDir, testResult.testFilePath),
        name: t.title,
        result: t.status === 'failed' ? 'fail' : t.status === 'passed' ? 'pass' : 'skip',
        suites: t.ancestorTitles,
        type: 'test',
        error: t.failureMessages.join('\n\n'),
        stdout: testResult.console?.map(formatConsoleLine).join('\n'),
      });
    }
  }

  async onRunComplete() {
    if (!this.reporter || !this.group || !this.testRuns.length || !this.startTime) {
      return;
    }

    this.group.durationMs = Date.now() - this.startTime;

    await this.reporter.reportTests({
      group: this.group,
      testRuns: this.testRuns,
    });
  }
}
