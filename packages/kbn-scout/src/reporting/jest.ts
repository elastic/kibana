/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { Circus, Config } from '@jest/types';
import { AggregatedResult, BaseReporter, Test, TestCaseResult, TestContext } from '@jest/reporters';
import { ToolingLog } from '@kbn/tooling-log';
import { generateTestRunId, getTestIDForTitle, ScoutReport, ScoutReportEventAction } from '.';
import { environmentMetadata } from '../datasources';
import { SCOUT_REPORT_OUTPUT_ROOT } from '../paths';

/**
 * Configuration options for the AppEx QA Jest reporter
 */
export interface ScoutJestReporterOptions {
  name?: string;
  outputPath?: string;
}

/**
 * AppEx QA Jest reporter
 */
export class ScoutJestReporter extends BaseReporter {
  readonly logger: ToolingLog;
  readonly name: string;
  readonly runId: string;
  private report: ScoutReport;

  constructor(
    jestGlobalConfig: Config.GlobalConfig,
    private reporterOptions: ScoutJestReporterOptions = {}
  ) {
    super();
    this.logger = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.name = this.reporterOptions.name || 'unknown';
    this.runId = generateTestRunId();
    this.logger.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutReport(this.logger);
  }

  /**
   * Root path of this reporter's output
   */
  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-jest-${this.runId}`);
  }

  onRunStart() {
    /**
     * Root suite execution began (all files have been parsed and hooks/tests are ready for execution)
     */
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: {
        id: this.runId,
      },
      event: {
        action: ScoutReportEventAction.RUN_BEGIN,
      },
    });
  }

  onTestCaseStart(_: Test, testInfo: Circus.TestCaseStartInfo) {
    /**
     * Test execution started
     */

    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: {
        id: this.runId,
      },
      suite: {
        title: testInfo.ancestorTitles.join(' ') || 'unknown',
        type: 'suite',
      },
      test: {
        id: getTestIDForTitle(testInfo.fullName),
        title: testInfo.title,
        tags: [],
      },
      event: {
        action: ScoutReportEventAction.TEST_BEGIN,
      },
    });
  }

  onTestCaseResult(test: Test, result: TestCaseResult) {
    /**
     * Test execution ended
     */
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: {
        id: this.runId,
      },
      suite: {
        title: result.ancestorTitles.join(' ') || 'unknown',
        type: 'suite',
      },
      test: {
        id: getTestIDForTitle(result.fullName),
        title: result.fullName,
        tags: [],
        status: result.status,
        duration: result.duration || test.duration,
      },
      event: {
        action: ScoutReportEventAction.TEST_END,
        error: {
          message: result.failureMessages.join('\n\n'),
        },
      },
    });
  }

  onRunComplete(_: Set<TestContext>, results: AggregatedResult) {
    /**
     * Root suite execution has ended
     */
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: {
        id: this.runId,
        status: results.success ? 'passed' : 'failed',
        duration: Date.now() - results.startTime,
      },
      event: {
        action: ScoutReportEventAction.RUN_END,
      },
    });

    // Save & conclude the report
    try {
      this.report.save(this.reportRootPath);
    } finally {
      this.report.conclude();
    }
  }
}
