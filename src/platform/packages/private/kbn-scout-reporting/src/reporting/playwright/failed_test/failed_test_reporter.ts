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
  TestResult,
} from '@playwright/test/reporter';

import {
  getCodeOwnersEntries,
  getOwningTeamsForPath,
  type CodeOwnersEntry,
} from '@kbn/code-owners';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import path from 'node:path';
import { SCOUT_REPORT_OUTPUT_ROOT, ScoutTestTarget } from '@kbn/scout-info';
import {
  computeTestID,
  excapeHtmlCharacters,
  generateTestRunId,
  getKibanaModuleData,
  getRunCommand,
  getTestTargetFromProcessArguments,
  parseStdout,
  stripFilePath,
} from '../../../helpers';
import type { TestFailure } from '../../report';
import { ScoutFailureReport } from '../../report';
import type { ScoutPlaywrightReporterOptions } from '../scout_playwright_reporter';
import { ScoutFailureTracker } from './failure_tracking';

/**
 * Scout Failed Test reporter
 */
export class ScoutFailedTestReporter implements Reporter {
  private readonly log: ToolingLog;
  private readonly runId: string;
  private readonly codeOwnersEntries: CodeOwnersEntry[];
  private readonly report: ScoutFailureReport;
  private readonly command: string;
  private readonly testTarget: string;
  private failureTracker?: ScoutFailureTracker;
  private kibanaModule: TestFailure['kibanaModule'];

  constructor(private readonly reporterOptions: ScoutPlaywrightReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.report = new ScoutFailureReport(this.log);
    this.codeOwnersEntries = getCodeOwnersEntries();
    this.runId = this.reporterOptions.runId || generateTestRunId();
    this.command = getRunCommand();
    this.testTarget =
      (ScoutTestTarget.tryFromEnv() || getTestTargetFromProcessArguments())?.tag || 'unknown';
  }

  private getFileOwners(filePath: string): string[] {
    return getOwningTeamsForPath(filePath, this.codeOwnersEntries);
  }

  private formatTestError(result: TestResult): TestFailure['error'] {
    return {
      message: result.error?.message ? stripFilePath(result.error.message) : undefined,
      stack_trace: result.error?.stack
        ? excapeHtmlCharacters(stripFilePath(result.error.stack))
        : undefined,
    };
  }

  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-playwright-test-failures-${this.runId}`);
  }

  printsToStdio(): boolean {
    return false; // Avoid taking over console output
  }

  onBegin(config: FullConfig, suite: Suite) {
    // Get plugin or package metadata from kibana.jsonc
    if (config.configFile) {
      const metadata = getKibanaModuleData(config.configFile);
      this.kibanaModule = {
        id: metadata.id,
        type: metadata.type,
        visibility: metadata.visibility,
        group: metadata.group,
      };
    }

    // Initialize failure tracker for GitHub issue integration
    const reportRootPath = path.join(
      SCOUT_REPORT_OUTPUT_ROOT,
      `scout-playwright-test-failures-${this.runId}`
    );
    this.failureTracker = new ScoutFailureTracker(this.log, reportRootPath, this.runId);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Playwright marks timeouts and interruptions as separate statuses, but we still
    // want to generate a Scout failure report artifact for them (e.g. global.setup.ts timeouts).
    if (
      result.status !== 'failed' &&
      result.status !== 'timedOut' &&
      result.status !== 'interrupted'
    ) {
      return;
    }

    // We don't include the first three elements in the title path (root suite, project, test file path)
    // for full test titles in Scout, especially not when calculating test IDs
    const fullTestTitle = test.titlePath().slice(3).join(' ');
    const testFilePath = path.relative(REPO_ROOT, test.location.file);

    const testFailure: TestFailure = {
      id: computeTestID(testFilePath, fullTestTitle),
      suite: test.parent.title,
      title: test.title,
      target: this.testTarget,
      command: this.command,
      location: stripFilePath(test.location.file),
      owner: this.getFileOwners(path.relative(REPO_ROOT, test.location.file)),
      kibanaModule: this.kibanaModule,
      duration: result.duration,
      error: this.formatTestError(result),
      stdout: result.stdout ? parseStdout(result.stdout) : undefined,
      attachments: result.attachments.map((attachment) => ({
        name: attachment.name,
        path: attachment.path,
        contentType: attachment.contentType,
      })),
    };

    this.report.logEvent(testFailure);

    // Also track failure for GitHub issue integration
    this.failureTracker?.addFailure(testFailure);
  }

  onEnd(result: FullResult) {
    // Save & conclude the report
    try {
      this.report.save(this.reportRootPath);
      // Save failure tracking file for GitHub issue integration
      this.failureTracker?.save();
    } finally {
      this.report.conclude();
    }
  }
}
