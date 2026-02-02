/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'node:fs';
import path from 'node:path';
import { ScoutReport, ScoutReportError } from '../base';
import { buildFailureHtml } from './html';
import type { TestFailure } from './test_failure';

const saveTestFailuresReport = (
  reportPath: string,
  testFailureHtml: string,
  log: ToolingLog,
  message: string
): void => {
  try {
    fs.writeFileSync(reportPath, testFailureHtml, 'utf-8');
    log.info(message);
  } catch (error) {
    log.error(`Failed to save report at ${reportPath}: ${error.message}`);
  }
};

export class ScoutFailureReport extends ScoutReport {
  constructor(log?: ToolingLog) {
    super('Scout Failure report', log);
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

    // Create test-artifacts directory for individual PNG files
    const testArtifactsDir = path.join('.scout', 'test-artifacts');
    fs.mkdirSync(testArtifactsDir, { recursive: true });

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

      // Save individual PNG files for Buildkite artifact upload
      this.saveAttachmentsAsPngFiles(failure, testArtifactsDir);
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
      `Test Failures Summary is saved at ${testFailuresSummaryReportPath}`
    );
  }

  /**
   * Save test failure attachments as individual PNG files for Buildkite artifact upload
   */
  private saveAttachmentsAsPngFiles(failure: TestFailure, testArtifactsDir: string) {
    if (!failure.attachments || failure.attachments.length === 0) {
      return;
    }

    // Filter for image attachments
    const imageAttachments = failure.attachments.filter(
      (attachment) =>
        attachment.contentType.startsWith('image/') &&
        attachment.path &&
        fs.existsSync(attachment.path)
    );

    for (const attachment of imageAttachments) {
      try {
        // Create a unique filename for the screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${failure.id}_${attachment.name}_${timestamp}.png`;
        const destinationPath = path.join(testArtifactsDir, filename);

        // Copy the attachment file to the test-artifacts directory
        fs.copyFileSync(attachment.path!, destinationPath);

        this.log.info(`Saved screenshot: ${filename} -> ${destinationPath}`);
      } catch (error) {
        this.log.error(
          `Failed to save screenshot ${attachment.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
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
