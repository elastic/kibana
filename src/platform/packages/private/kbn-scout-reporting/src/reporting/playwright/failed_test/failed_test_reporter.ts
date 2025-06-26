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
import { REPO_ROOT } from '@kbn/repo-info';
import {
  type CodeOwnersEntry,
  getCodeOwnersEntries,
  getOwningTeamsForPath,
} from '@kbn/code-owners';
import type { TestFailure } from '../../report';
import { ScoutFailureReport } from '../../report';
import type { ScoutPlaywrightReporterOptions } from '../scout_playwright_reporter';
import {
  getRunTarget,
  getPluginManifestData,
  parseStdout,
  generateTestRunId,
  getTestIDForTitle,
  stripRunCommand,
  stripFilePath,
  excapeHtmlCharacters,
} from '../../../helpers';

/**
 * Scout Failed Test reporter
 */
export class ScoutFailedTestReporter implements Reporter {
  private readonly log: ToolingLog;
  private readonly runId: string;
  private readonly codeOwnersEntries: CodeOwnersEntry[];
  private readonly report: ScoutFailureReport;
  private target: string;
  private plugin: TestFailure['plugin'];
  private command: string;

  constructor(private reporterOptions: ScoutPlaywrightReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    this.report = new ScoutFailureReport(this.log);
    this.codeOwnersEntries = getCodeOwnersEntries();

    this.runId = this.reporterOptions.runId || generateTestRunId();
    this.target = 'undefined'; // when '--grep' is not provided in the command line
    this.command = stripRunCommand(process.argv);
  }

  private getFileOwners(filePath: string): string[] {
    return getOwningTeamsForPath(filePath, this.codeOwnersEntries);
  }

  public get reportRootPath(): string {
    const outputPath = this.reporterOptions.outputPath || SCOUT_REPORT_OUTPUT_ROOT;
    return path.join(outputPath, `scout-playwright-test-failures-${this.runId}`);
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

    this.target = getRunTarget();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      this.report.logEvent({
        id: getTestIDForTitle(test.titlePath().join(' ')),
        suite: test.parent.title,
        title: test.title,
        target: this.target,
        command: this.command,
        location: stripFilePath(test.location.file),
        owner: this.getFileOwners(path.relative(REPO_ROOT, test.location.file)),
        plugin: this.plugin,
        duration: result.duration,
        error: {
          message: result.error?.message ? stripFilePath(result.error.message) : undefined,
          stack_trace: result.error?.stack
            ? excapeHtmlCharacters(stripFilePath(result.error.stack))
            : undefined,
        },
        stdout: result.stdout ? parseStdout(result.stdout) : undefined,
        attachments: result.attachments.map((attachment) => ({
          name: attachment.name,
          path: attachment.path,
          contentType: attachment.contentType,
        })),
      });
    }
  }

  onEnd(result: FullResult) {
    // Save & conclude the report
    try {
      this.report.save(this.reportRootPath);
    } finally {
      this.report.conclude();
    }
  }
}
