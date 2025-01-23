/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { SCOUT_REPORT_OUTPUT_ROOT } from '@kbn/scout-info';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  generateTestRunId,
  getTestIDForTitle,
  datasources,
  ScoutEventsReport,
  ScoutReportEventAction,
} from '@kbn/scout-reporting';
import {
  getOwningTeamsForPath,
  getCodeOwnersEntries,
  type CodeOwnersEntry,
} from '@kbn/code-owners';
import { Runner, Test } from '../../../fake_mocha_types';

/**
 * Configuration options for the Scout Mocha reporter
 */
export interface ScoutFTRReporterOptions {
  name?: string;
  outputPath?: string;
}

/**
 * Scout Mocha reporter
 */
export class ScoutFTRReporter {
  readonly log: ToolingLog;
  readonly name: string;
  readonly runId: string;
  private report: ScoutEventsReport;
  private readonly codeOwnersEntries: CodeOwnersEntry[];

  constructor(private runner: Runner, private reporterOptions: ScoutFTRReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.name = this.reporterOptions.name || 'ftr';
    this.runId = generateTestRunId();
    this.log.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutEventsReport(this.log);
    this.codeOwnersEntries = getCodeOwnersEntries();

    // Register event listeners
    for (const [eventName, listener] of Object.entries({
      start: this.onRunStart,
      end: this.onRunEnd,
      test: this.onTestStart,
      'test end': this.onTestEnd,
    })) {
      runner.on(eventName, listener);
    }
  }

  private getFileOwners(filePath: string): string[] {
    return getOwningTeamsForPath(filePath, this.codeOwnersEntries);
  }

  /**
   * Root path of this reporter's output
   */
  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-ftr-${this.runId}`);
  }

  onRunStart = () => {
    /**
     * Root suite execution began (all files have been parsed and hooks/tests are ready for execution)
     */
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'ftr',
      },
      test_run: {
        id: this.runId,
      },
      event: {
        action: ScoutReportEventAction.RUN_BEGIN,
      },
    });
  };

  onTestStart = (test: Test) => {
    /**
     * Test execution started
     */
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'ftr',
      },
      test_run: {
        id: this.runId,
      },
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: getTestIDForTitle(test.fullTitle()),
        title: test.title,
        tags: [],
      },
      event: {
        action: ScoutReportEventAction.TEST_BEGIN,
      },
      file: {
        path: test.file ? path.relative(REPO_ROOT, test.file) : 'unknown',
        owner: test.file ? this.getFileOwners(path.relative(REPO_ROOT, test.file)) : 'unknown',
      },
    });
  };

  onTestEnd = (test: Test) => {
    /**
     * Test execution ended
     */
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'ftr',
      },
      test_run: {
        id: this.runId,
      },
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: getTestIDForTitle(test.fullTitle()),
        title: test.title,
        tags: [],
        status: test.isPending() ? 'skipped' : test.isPassed() ? 'passed' : 'failed',
        duration: test.duration,
      },
      event: {
        action: ScoutReportEventAction.TEST_END,
        error: {
          message: test.err?.message,
          stack_trace: test.err?.stack,
        },
      },
      file: {
        path: test.file ? path.relative(REPO_ROOT, test.file) : 'unknown',
        owner: test.file ? this.getFileOwners(path.relative(REPO_ROOT, test.file)) : 'unknown',
      },
    });
  };

  onRunEnd = () => {
    /**
     * Root suite execution has ended
     */
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'ftr',
      },
      test_run: {
        id: this.runId,
        status: this.runner.stats?.failures === 0 ? 'passed' : 'failed',
        duration: this.runner.stats?.duration || 0,
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
  };
}
