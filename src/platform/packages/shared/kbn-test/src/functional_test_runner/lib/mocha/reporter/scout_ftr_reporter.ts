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
import { SCOUT_REPORT_OUTPUT_ROOT, ScoutTestTarget } from '@kbn/scout-info';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutFileInfo } from '@kbn/scout-reporting';
import { computeTestID } from '@kbn/scout-reporting';
import {
  datasources,
  ScoutEventsReport,
  ScoutReportEventAction,
  type ScoutTestRunInfo,
  generateTestRunId,
} from '@kbn/scout-reporting';
import {
  type CodeOwnersEntry,
  type CodeOwnerArea,
  getOwningTeamsForPath,
  getCodeOwnersEntries,
  findAreaForCodeOwner,
} from '@kbn/code-owners';
import type { Runner, Test } from '../../../fake_mocha_types';
import type { Config as FTRConfig } from '../../config';

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
  private readonly baseTestRunInfo: ScoutTestRunInfo;
  private readonly codeOwnersEntries: CodeOwnersEntry[];

  constructor(
    private runner: Runner,
    config: FTRConfig,
    private reporterOptions: ScoutFTRReporterOptions = {}
  ) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.name = this.reporterOptions.name || 'ftr';
    this.runId = generateTestRunId();
    this.log.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutEventsReport(this.log);
    this.codeOwnersEntries = getCodeOwnersEntries();

    const testTarget = ScoutTestTarget.tryFromEnv();

    this.baseTestRunInfo = {
      id: this.runId,
      target: {
        type: testTarget?.location || 'local',
        mode: testTarget?.tagWithoutLocation || 'unknown',
      },
      config: {
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, config.path)),
        category: config.get('testConfigCategory'),
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
      test_run: this.baseTestRunInfo,
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
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: computeTestID(path.relative(REPO_ROOT, test.file || ''), test.fullTitle()),
        title: test.title,
        tags: [],
        file: test.file
          ? this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.file))
          : undefined,
      },
      event: {
        action: ScoutReportEventAction.TEST_BEGIN,
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
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent?.fullTitle() || 'unknown',
        type: test.parent?.root ? 'root' : 'suite',
      },
      test: {
        id: computeTestID(path.relative(REPO_ROOT, test.file || ''), test.fullTitle()),
        title: test.title,
        tags: [],
        file: test.file
          ? this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.file))
          : undefined,
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
        type: 'ftr',
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
