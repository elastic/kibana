/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Config, AggregatedResult, TestContext } from '@jest/reporters';
import { BaseReporter } from '@jest/reporters';
import { TestResult } from '@jest/types';
import { ToolingLog } from '@kbn/tooling-log';
import {
  type CodeOwnerArea,
  CodeOwnersEntry,
  findAreaForCodeOwner,
  getCodeOwnersEntries,
  getOwningTeamsForPath,
} from '@kbn/code-owners';
import { SCOUT_REPORT_OUTPUT_ROOT, ScoutJestMetadata } from '@kbn/scout-info';
import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutJestReporterOptions } from './options';
import {
  datasources,
  generateTestRunId,
  getTestIDForTitle,
  ScoutEventsReport,
  ScoutFileInfo,
  ScoutReportEventAction,
  type ScoutTestRunInfo,
  uploadScoutReportEvents,
} from '../../..';

/**
 * Scout Jest reporter
 */
export class ScoutJestReporter extends BaseReporter {
  name: string;
  readonly scoutLog: ToolingLog;
  readonly runId: string;
  private report: ScoutEventsReport;
  private baseTestRunInfo: ScoutTestRunInfo;
  private readonly codeOwnersEntries: CodeOwnersEntry[];

  constructor(
    _jestGlobalConfig: Config.GlobalConfig,
    private reporterOptions: ScoutJestReporterOptions
  ) {
    super();
    this.scoutLog = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.name = this.reporterOptions.name || 'unknown';
    this.runId = this.reporterOptions.runId || generateTestRunId();
    this.scoutLog.info(`Scout test run ID: ${this.runId}`);

    this.report = new ScoutEventsReport(this.scoutLog);
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
    return path.join(outputPath, `scout-jest-${this.runId}`);
  }

  /**
   * Look for Scout metadata in Jest globals and update this reporter instance if necessary
   *
   * @param jestGlobals Jest globals
   */
  loadMetadataFromJestGlobals(jestGlobals: Config.ConfigGlobals): void {
    if (!Object.hasOwn(jestGlobals, 'scout')) {
      // No Scout metadata in Jest globals
      return;
    }

    const metadata = jestGlobals.scout as ScoutJestMetadata;

    if (metadata.reporter.name !== undefined) {
      this.name = metadata.reporter.name;
    }

    this.baseTestRunInfo = {
      ...this.baseTestRunInfo,
      config: {
        ...this.baseTestRunInfo.config,
        file: this.getScoutFileInfoForPath(metadata.configFilePath),
        category: metadata.testRunConfigCategory,
      },
    };
  }

  /**
   * Separate the error message from the stack trace in a Jest failure message
   *
   * If the message doesn't contain a stack trace, it'll return unmodified.
   *
   * @param message Jest failure message
   */
  parseJestFailureMessage(message: string) {
    const match = message.match(/(?<message>^.+?)(\r\n|\r|\n)(?=.+?at)\s(?<stack_trace>.+$)/s);

    return match === null
      ? { message }
      : (match.groups as { message: string; stack_trace?: string });
  }

  /**
   * Log a Jest test result as a Scout reporter event
   *
   * @param test Jest test information
   * @param test.result Jest test result
   * @param test.filePath Jest test file path
   *
   */
  logTestResult(test: { result: TestResult.AssertionResult; filePath: string }): void {
    const suiteTitle = test.result.ancestorTitles.join(' ');
    const parsedErrorMessages: string[] = [];
    const parsedStackTraces: string[] = [];

    test.result.failureMessages
      .map((message) => this.parseJestFailureMessage(message))
      .forEach((parsed) => {
        if (parsed.message) {
          parsedErrorMessages.push(parsed.message);
        }
        if (parsed.stack_trace) {
          parsedStackTraces.push(parsed.stack_trace);
        }
      });

    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: this.baseTestRunInfo,
      suite: {
        title: suiteTitle || 'unknown',
        type: test.result.ancestorTitles.length <= 1 ? 'root' : 'suite',
      },
      test: {
        id: getTestIDForTitle(test.result.fullName),
        title: test.result.title,
        tags: [],
        file: this.getScoutFileInfoForPath(path.relative(REPO_ROOT, test.filePath)),
        status: test.result.status === 'pending' ? 'skipped' : test.result.status,
        duration: test.result.duration || 0,
      },
      event: {
        action: ScoutReportEventAction.TEST_END,
        error: {
          message:
            parsedErrorMessages.length > 0
              ? parsedErrorMessages.join('\n--- NEXT ERROR ---\n')
              : undefined,
          stack_trace:
            parsedStackTraces.length > 0
              ? parsedStackTraces.join('\n--- NEXT STACK TRACE ---\n')
              : undefined,
        },
      },
    });
  }

  async onRunComplete(testContexts: Set<TestContext>, results: AggregatedResult): Promise<void> {
    /**
     * Test execution ended
     */
    // Load Scout metadata from Jest globals
    const context = testContexts.values().next().value as TestContext;
    this.loadMetadataFromJestGlobals(context.config.globals);

    // Log "run start" event
    this.report.logEvent({
      ...datasources.environmentMetadata,
      '@timestamp': new Date(results.startTime),
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: this.baseTestRunInfo,
      event: {
        action: ScoutReportEventAction.RUN_BEGIN,
      },
    });

    // Turn test results into events in bulk
    results.testResults.forEach((suite) => {
      suite.testResults.forEach((testResult) => {
        this.logTestResult({ result: testResult, filePath: suite.testFilePath });
      });
    });

    // Log "run end" event
    this.report.logEvent({
      ...datasources.environmentMetadata,
      reporter: {
        name: this.name,
        type: 'jest',
      },
      test_run: {
        ...this.baseTestRunInfo,
        status: results.numFailedTests === 0 ? 'passed' : 'failed',
        duration: Date.now() - results.startTime || 0,
      },
      event: {
        action: ScoutReportEventAction.RUN_END,
      },
    });

    // Save & conclude the report
    try {
      this.report.save(this.reportRootPath);
      await uploadScoutReportEvents(this.report.eventLogPath, this.scoutLog);
    } catch (e) {
      // Log the error but don't propagate it
      this.scoutLog.error(e);
    } finally {
      this.report.conclude();
    }
  }
}
