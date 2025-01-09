/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { ToolingLog } from '@kbn/tooling-log';
import { saveTestFailuresReport } from './save_test_failures';
import { buildFailureHtml } from './build_test_failure_html';
import { GenericReport, ScoutReportError } from '../generic_report';
import { TestFailure } from './test_failure';

export class ScoutFailureReport extends GenericReport {
  constructor(log?: ToolingLog) {
    super();
    this.log = log || new ToolingLog();
    this.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-failures-report-'));
    this.reportName = 'Scout Test Failures report';
  }

  public get testFailuresPath(): string {
    return path.join(this.workDir, `test-failures.ndjson`);
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
