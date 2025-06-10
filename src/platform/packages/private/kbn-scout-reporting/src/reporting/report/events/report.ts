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
import { ScoutReportEvent } from './event';
import { ScoutReport, ScoutReportError } from '../base';

/**
 *
 */
export class ScoutEventsReport extends ScoutReport {
  constructor(log?: ToolingLog) {
    super('Scout Events report', log);
    this.log = log || new ToolingLog();
    this.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-report-'));
  }

  public get eventLogPath(): string {
    return path.join(this.workDir, `event-log.ndjson`);
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
    this.log.info(`Saving ${this.reportName} to ${destination}`);
    fs.mkdirSync(destination, { recursive: true });

    // Copy the workdir data to the destination
    fs.cpSync(this.workDir, destination, { recursive: true });
  }
}
