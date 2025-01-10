/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ToolingLog } from '@kbn/tooling-log';
import { saveTestFailuresReport } from './save_test_failures';
import { buildFailureHtml } from './build_test_failure_html';
import { TestFailure } from './test_failure';

/**
 * Generic error raised by a Scout report
 */
export class ScoutReportError extends Error {}

export class ScoutFailureReport {
  log: ToolingLog;
  workDir: string;
  reportName: string;
  concluded = false;

  constructor(log?: ToolingLog) {
    this.log = log || new ToolingLog();
    this.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-failures-report-'));
    this.reportName = 'Scout Test Failures report';
  }

  public get testFailuresPath(): string {
    return path.join(this.workDir, `test-failures.ndjson`);
  }

  private raiseIfConcluded(additionalInfo?: string) {
    if (this.concluded) {
      let message = `Report at ${this.workDir} was concluded`;

      if (additionalInfo) {
        message += `: ${additionalInfo}`;
      }

      throw new ScoutReportError(message);
    }
  }

  /**
   * Logs a failure to be processed by this reporter
   *
   * @param failure {TestFailure} - test failure to record
   */
  logEvent(failure: TestFailure) {
    this.raiseIfConcluded('logging new failures is no longer allowed');

    fs.appendFileSync(this.testFailuresPath, JSON.stringify(failure) + '\n');
  }

  /**
   * Save the report to a non-ephemeral location
   *
   * @param destination - Full path to the save location. Must not exist.
   */
  save(destination: string) {
    this.raiseIfConcluded('nothing to save because workdir has been cleared');

    if (fs.existsSync(destination)) {
      throw new ScoutReportError(`Save destination path '${destination}' already exists`);
    }

    const testFailures: TestFailure[] = this.readFailuresFromNDJSON();

    if (testFailures.length === 0) {
      this.log.info('No test failures to report');
      return;
    }

    // Create the destination directory
    this.log.info(
      `Saving ${this.reportName} to ${destination}: ${testFailures.length} failures reported`
    );
    fs.mkdirSync(destination, { recursive: true });

    // Generate HTML report for each failed test with embedded screenshots
    for (const failure of testFailures) {
      const htmlContent = buildFailureHtml(failure);
      const htmlReportPath = path.join(destination, `${failure.id}.html`);
      saveTestFailuresReport(
        htmlReportPath,
        htmlContent,
        this.log,
        `Html report for ${failure.id} is saved at ${htmlReportPath}`
      );
    }

    const summaryContent = testFailures.map((failure) => {
      return {
        name: `${failure.target} - ${failure.suite} - ${failure.title}`,
        htmlReportFilename: `${failure.id}.html`,
      };
    });

    // Short summary report linking to the detailed HTML reports
    const testFailuresSummaryReportPath = path.join(destination, 'test-failures-summary.json');
    saveTestFailuresReport(
      testFailuresSummaryReportPath,
      JSON.stringify(summaryContent, null, 2),
      this.log,
      `Summary report is saved at ${testFailuresSummaryReportPath}`
    );
  }

  /**
   * Call this when you're done adding information to this report.
   *
   * ⚠️**This will delete all the contents of the report's working directory**
   */
  conclude() {
    // Remove the working directory
    this.log.info(`Removing Scout report working directory ${this.workDir}`);
    fs.rmSync(this.workDir, { recursive: true, force: true });

    // Mark this report as concluded
    this.concluded = true;
    this.log.success('Scout report has concluded.');
  }

  /**
   * Reads all failures from the NDJSON file and parses them as TestFailure[].
   */
  private readFailuresFromNDJSON(): TestFailure[] {
    if (!fs.existsSync(this.testFailuresPath)) {
      return [];
    }

    const fileContent = fs.readFileSync(this.testFailuresPath, 'utf-8');
    return fileContent
      .split('\n') // Split lines
      .filter((line) => line.trim() !== '') // Remove empty lines
      .map((line) => JSON.parse(line) as TestFailure); // Parse each line into an object
  }
}
