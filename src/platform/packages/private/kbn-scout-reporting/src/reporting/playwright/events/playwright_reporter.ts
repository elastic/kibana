/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { SCOUT_REPORT_OUTPUT_ROOT, ScoutTestRunConfigCategory } from '@kbn/scout-info';
import stripANSI from 'strip-ansi';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  type CodeOwnersEntry,
  type CodeOwnerArea,
  getCodeOwnersEntries,
  getOwningTeamsForPath,
  findAreaForCodeOwner,
} from '@kbn/code-owners';
import {
  ScoutEventsReport,
  ScoutFileInfo,
  ScoutReportEventAction,
  type ScoutTestRunInfo,
  uploadScoutReportEvents,
} from '../../report';
import { environmentMetadata } from '../../../datasources';
import type { ScoutPlaywrightReporterOptions } from '../scout_playwright_reporter';
import { generateTestRunId, getTestIDForTitle } from '../../../helpers';

/**
 * Scout Playwright reporter
 */
export class ScoutPlaywrightReporter implements Reporter {
  readonly log: ToolingLog;
  readonly name: string;
  readonly runId: string;
  private report: ScoutEventsReport;
  private baseTestRunInfo: ScoutTestRunInfo;
  private readonly codeOwnersEntries: CodeOwnersEntry[];

  constructor(private reporterOptions: ScoutPlaywrightReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.name = this.reporterOptions.name || 'unknown';
    this.runId = this.reporterOptions.runId || generateTestRunId();
    this.log.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutEventsReport(this.log);
    this.baseTestRunInfo = { id: this.runId };
    this.codeOwnersEntries = getCodeOwnersEntries();
  }

  private getFileOwners(filePath: string): string[] {
    return getOwningTeamsForPath(filePath, this.codeOwnersEntries);
  }

  private getOwnerAreas(owners: string[]): CodeOwnerArea[] {
    return owners
      .map((owner) => findAreaForCodeOwner(owner))
      .filter((area) => area !== undefined) as CodeOwnerArea[];
  }

  private getScoutFileInfoForPath(filePath: string): ScoutFileInfo {
    const fileOwners = this.getFileOwners(filePath);

    return {
      path: filePath,
      owner: fileOwners,
      area: this.getOwnerAreas(fileOwners),
    };
  }

  /**
   * Root path of this reporter's output
   */
  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-playwright-${this.runId}`);
  }

  printsToStdio(): boolean {
    // Don't take over console output
    return false;
  }

  onBegin(config: FullConfig, _: Suite) {
    // Enrich base test run info with config file info
    let configInfo: ScoutTestRunInfo['config'];

    if (config.configFile !== undefined) {
      configInfo = {
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, config.configFile)),
        category: ScoutTestRunConfigCategory.UI_TEST,
      };
    }

    this.baseTestRunInfo = {
      ...this.baseTestRunInfo,
      config: configInfo,
    };

    // Log event
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      event: {
        action: ScoutReportEventAction.RUN_BEGIN,
      },
    });
  }

  onTestBegin(test: TestCase, result: TestResult) {
    this.report.logEvent({
      '@timestamp': result.startTime,
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent.titlePath().join(' '),
        type: test.parent.type,
      },
      test: {
        id: getTestIDForTitle(test.titlePath().join(' ')),
        title: test.title,
        tags: test.tags,
        annotations: test.annotations,
        expected_status: test.expectedStatus,
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.location.file)),
      },
      event: {
        action: ScoutReportEventAction.TEST_BEGIN,
      },
    });
  }

  onStepBegin(test: TestCase, _: TestResult, step: TestStep) {
    this.report.logEvent({
      '@timestamp': step.startTime,
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent.titlePath().join(' '),
        type: test.parent.type,
      },
      test: {
        id: getTestIDForTitle(test.titlePath().join(' ')),
        title: test.title,
        tags: test.tags,
        annotations: test.annotations,
        expected_status: test.expectedStatus,
        step: {
          title: step.titlePath().join(' '),
          category: step.category,
        },
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.location.file)),
      },
      event: {
        action: ScoutReportEventAction.TEST_STEP_BEGIN,
      },
    });
  }

  onStepEnd(test: TestCase, _: TestResult, step: TestStep) {
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent.titlePath().join(' '),
        type: test.parent.type,
      },
      test: {
        id: getTestIDForTitle(test.titlePath().join(' ')),
        title: test.title,
        tags: test.tags,
        annotations: test.annotations,
        expected_status: test.expectedStatus,
        step: {
          title: step.titlePath().join(' '),
          category: step.category,
          duration: step.duration,
        },
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.location.file)),
      },
      event: {
        action: ScoutReportEventAction.TEST_STEP_END,
        error: {
          message: step.error?.message ? stripANSI(step.error.message) : undefined,
          stack_trace: step.error?.stack ? stripANSI(step.error.stack) : undefined,
        },
      },
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: test.parent.titlePath().join(' '),
        type: test.parent.type,
      },
      test: {
        id: getTestIDForTitle(test.titlePath().join(' ')),
        title: test.title,
        tags: test.tags,
        annotations: test.annotations,
        expected_status: test.expectedStatus,
        status: result.status,
        duration: result.duration,
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.location.file)),
      },
      event: {
        action: ScoutReportEventAction.TEST_END,
        error: {
          message: result.error?.message ? stripANSI(result.error.message) : undefined,
          stack_trace: result.error?.stack ? stripANSI(result.error.stack) : undefined,
        },
      },
    });
  }

  async onEnd(result: FullResult) {
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: {
        ...this.baseTestRunInfo,
        status: result.status,
        duration: result.duration,
      },
      event: {
        action: ScoutReportEventAction.RUN_END,
      },
    });

    // Save, upload events & conclude the report
    try {
      this.report.save(this.reportRootPath);
      await uploadScoutReportEvents(this.report.eventLogPath, this.log);
    } catch (e) {
      // Log the error but don't propagate it
      this.log.error(e);
    } finally {
      this.report.conclude();
    }
  }

  async onExit() {
    // noop
  }

  onError(error: TestError) {
    this.report.logEvent({
      ...environmentMetadata,
      reporter: {
        name: this.name,
        type: 'playwright',
      },
      test_run: this.baseTestRunInfo,
      event: {
        action: ScoutReportEventAction.ERROR,
        error: {
          message: error.message ? stripANSI(error.message) : undefined,
          stack_trace: error.stack ? stripANSI(error.stack) : undefined,
        },
      },
    });
  }
}
