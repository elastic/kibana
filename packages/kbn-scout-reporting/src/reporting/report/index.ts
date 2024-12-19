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
import { ScoutReportEvent } from './event';

/**
 * Generic error raised by a Scout report
 */
export class ScoutReportError extends Error {}

/**
 *
 */
export class ScoutReport {
  log: ToolingLog;
  workDir: string;
  concluded = false;

  constructor(log?: ToolingLog) {
    this.log = log || new ToolingLog();
    this.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-report-'));
  }

  public get eventLogPath(): string {
    return path.join(this.workDir, `event-log.ndjson`);
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
   * Logs an event to be processed by this reporter
   *
   * @param event {ScoutReportEvent} - Event to record
   */
  logEvent(event: ScoutReportEvent) {
    this.raiseIfConcluded('logging new events is no longer allowed');

    if (event['@timestamp'] === undefined) {
      event['@timestamp'] = new Date();
    }

    fs.appendFileSync(this.eventLogPath, JSON.stringify(event) + '\n');
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

    // Create the destination directory
    this.log.info(`Saving Scout report to ${destination}`);
    fs.mkdirSync(destination, { recursive: true });

    // Copy the workdir data to the destination
    fs.cpSync(this.workDir, destination, { recursive: true });
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
}

export * from './event';
export * from './persistence';
