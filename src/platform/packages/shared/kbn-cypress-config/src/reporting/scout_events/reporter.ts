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
import type { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { SCOUT_REPORT_OUTPUT_ROOT, SCOUT_TARGET_MODE, SCOUT_TARGET_TYPE } from '@kbn/scout-info';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutFileInfo } from '@kbn/scout-reporting';
import {
  datasources,
  ScoutEventsReport,
  ScoutReportEventAction,
  type ScoutTestRunInfo,
  generateTestRunId,
  computeTestID,
} from '@kbn/scout-reporting';
import {
  type CodeOwnersEntry,
  type CodeOwnerArea,
  getOwningTeamsForPath,
  getCodeOwnersEntries,
  findAreaForCodeOwner,
} from '@kbn/code-owners';

/**
 * Configuration options for the Scout Cypress reporter
 */
export interface ScoutCypressReporterOptions {
  name?: string;
  outputPath?: string;
  config?: {
    path: string;
    category: ScoutTestRunConfigCategory;
  };
}

/**
 * Scout Cypress reporter
 */
export class ScoutCypressReporter {
  readonly log: ToolingLog;
  readonly name: string;
  readonly runId: string;
  private report: ScoutEventsReport;
  private readonly baseTestRunInfo: ScoutTestRunInfo;
  private readonly codeOwnersEntries: CodeOwnersEntry[];
  private readonly reporterOptions: ScoutCypressReporterOptions;

  constructor(
    private runner: Mocha.Runner,
    options: {
      reporterOptions?: ScoutCypressReporterOptions;
    }
  ) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.reporterOptions = options.reporterOptions || {};
    this.name = this.reporterOptions.name || 'cypress';
    this.runId = generateTestRunId();
    this.log.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutEventsReport(this.log);
    this.codeOwnersEntries = getCodeOwnersEntries();
    const configPath = this.reporterOptions.config?.path || undefined;
    const category = this.reporterOptions.config?.category || undefined;

    this.baseTestRunInfo = {
      id: this.runId,
      target: {
        type: SCOUT_TARGET_TYPE,
        mode: SCOUT_TARGET_MODE,
      },
      config: {
        file: configPath
          ? this.getScoutFileInfoForPath(path.relative(REPO_ROOT, configPath))
          : undefined,
        category,
      },
    };

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

  private getOwnerAreas(owners: string[]): CodeOwnerArea[] {
    return owners
      .map((owner) => findAreaForCodeOwner(owner))
      .filter((area): area is CodeOwnerArea => area !== undefined);
  }

  private getScoutFileInfoForPath(filePath: string): ScoutFileInfo {
    const fileOwners = this.getFileOwners(filePath);
    const areas = this.getOwnerAreas(fileOwners);

    return {
      path: filePath,
      owner: fileOwners.length > 0 ? fileOwners : 'unknown',
      area: areas.length > 0 ? areas : 'unknown',
    };
  }

  /**
   * Recursively find the file path by traversing up the parent chain
   * This is required as test.file can be undefined in some Cypress tests
   */
  private getTestFile(test: Mocha.Test): string | undefined {
    // Try test.file first
    if (test.file) {
      return test.file;
    }

    // Try parent suite
    if (test.parent) {
      return this.getSuiteFile(test.parent);
    }

    // Last resort: check the root suite from the runner
    if (this.runner.suite?.file) {
      return this.runner.suite.file;
    }

    return undefined;
  }

  private getSuiteFile(suite: Mocha.Suite): string | undefined {
    // Try suite.file first
    if (suite.file) {
      return suite.file;
    }

    // Try parent suite recursively
    if (suite.parent) {
      return this.getSuiteFile(suite.parent);
    }

    return undefined;
  }

  /**
   * Root path of this reporter's output
   */
  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-cypress-${this.runId}`);
  }

  onRunStart = () => {
    /**
     * Root suite execution began (all files have been parsed and hooks/tests are ready for execution)
     */
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'cypress',
      },
      test_run: this.baseTestRunInfo,
      event: {
        action: ScoutReportEventAction.RUN_BEGIN,
      },
    });
  };

  onTestStart = (test: Mocha.Test) => {
    /**
     * Test execution started
     */
    const testFile = this.getTestFile(test);
    const relativeTestFile = testFile ? path.relative(REPO_ROOT, testFile) : 'unknown';

    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'cypress',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: computeTestID(relativeTestFile, test.fullTitle()),
        title: test.title,
        tags: [],
        file: testFile ? this.getScoutFileInfoForPath(relativeTestFile) : undefined,
      },
      event: {
        action: ScoutReportEventAction.TEST_BEGIN,
      },
    });
  };

  onTestEnd = (test: Mocha.Test) => {
    /**
     * Test execution ended
     */
    const testFile = this.getTestFile(test);
    const relativeTestFile = testFile ? path.relative(REPO_ROOT, testFile) : 'unknown';

    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'cypress',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: computeTestID(relativeTestFile, test.fullTitle()),
        title: test.title,
        tags: [],
        status: test.isPending() ? 'skipped' : test.isPassed() ? 'passed' : 'failed',
        duration: test.duration,
        file: testFile ? this.getScoutFileInfoForPath(relativeTestFile) : undefined,
      },
      event: {
        action: ScoutReportEventAction.TEST_END,
        error: {
          message: test.err?.message,
          stack_trace: test.err?.stack,
        },
      },
    });
  };

  onRunEnd = () => {
    /**
     * Root suite execution has ended
     */
    const passes = this.runner.stats?.passes ?? 0;
    const failures = this.runner.stats?.failures ?? 0;
    const pending = this.runner.stats?.pending ?? 0;

    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'cypress',
      },
      test_run: {
        ...this.baseTestRunInfo,
        status: this.runner.stats?.failures === 0 ? 'passed' : 'failed',
        duration: this.runner.stats?.duration || 0,
        tests: {
          passes,
          failures,
          pending,
          total: passes + failures + pending,
        },
      },
      event: {
        action: ScoutReportEventAction.RUN_END,
      },
      process: {
        uptime: Math.floor(process.uptime() * 1000),
      },
    });

    // Save & conclude the report
    try {
      this.report.save(this.reportRootPath);
    } catch (e) {
      // Log the error but don't propagate it
      this.log.error(e);
    } finally {
      this.report.conclude();
    }
  };
}
