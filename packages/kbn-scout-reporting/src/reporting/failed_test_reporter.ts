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

import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { SCOUT_REPORT_OUTPUT_ROOT } from '@kbn/scout-info';
import stripANSI from 'strip-ansi';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  type CodeOwnersEntry,
  getCodeOwnersEntries,
  getOwningTeamsForPath,
} from '@kbn/code-owners';
import { generateTestRunId, getTestIDForTitle } from '.';
import { getPluginManifestData, saveTestFailuresReport } from './utils';
import type { TestFailure } from './test_failure';
import type { ScoutPlaywrightReporterOptions } from './scout_playwright_reporter';

/**
 * Scout Failed Test reporter
 */
export class ScoutFailedTestReporter implements Reporter {
  private readonly log: ToolingLog;
  private readonly runId: string;
  private readonly codeOwnersEntries: CodeOwnersEntry[];
  private target: string;
  private testFailures: TestFailure[];
  private plugin: TestFailure['plugin'];

  constructor(private reporterOptions: ScoutPlaywrightReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.runId = this.reporterOptions.runId || generateTestRunId();
    this.codeOwnersEntries = getCodeOwnersEntries();
    this.testFailures = [];
    this.target = 'undefined'; // when '--grep' is not provided in the command line
  }

  private getFileOwners(filePath: string): string[] {
    return getOwningTeamsForPath(filePath, this.codeOwnersEntries);
  }

  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-playwright-failed-test-${this.runId}`);
  }

  printsToStdio(): boolean {
    return false; // Avoid taking over console output
  }

  onBegin(config: FullConfig, suite: Suite) {
    // Get plugin metadata from kibana.jsonc
    if (config.configFile) {
      const metadata = getPluginManifestData(config.configFile);
      this.plugin = {
        id: metadata.plugin.id,
        visibility: metadata.visibility,
        group: metadata.group,
      };
    }
    // Get the target from the --grep argument, e.g. --grep=@svlSearch
    const grepArg = process.argv.find((arg) => arg.includes('--grep'));
    if (grepArg) {
      this.target = grepArg.split('=')[1];
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') return;

    const testFailure: TestFailure = {
      id: getTestIDForTitle(test.titlePath().join(' ')),
      suite: test.parent.title,
      title: test.title,
      target: this.target,
      location: test.location.file.replace(`${REPO_ROOT}/`, ''),
      owner: this.getFileOwners(path.relative(REPO_ROOT, test.location.file)),
      plugin: this.plugin,
      duration: result.duration,
      error: {
        message: result.error?.message ? stripANSI(result.error.message) : undefined,
        stack_trace: result.error?.stack ? stripANSI(result.error.stack) : undefined,
      },
      attachments: result.attachments.map((attachment) => ({
        name: attachment.name,
        path: attachment.path,
        contentType: attachment.contentType,
      })),
    };

    this.testFailures.push(testFailure);
  }

  onEnd(result: FullResult) {
    if (this.testFailures.length === 0) return;

    const filename = `failed-tests-${this.plugin?.id}.json`;
    saveTestFailuresReport(this.testFailures, this.reportRootPath, filename, this.log);
  }
}

// eslint-disable-next-line import/no-default-export
export default ScoutFailedTestReporter;
