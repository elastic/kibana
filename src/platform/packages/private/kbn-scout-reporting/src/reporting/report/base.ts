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

/**
 * Generic error raised by a Scout report
 */
export class ScoutReportError extends Error {}

export abstract class ScoutReport {
  log: ToolingLog;
  workDir: string;
  concluded = false;
  reportName: string;

  protected constructor(reportName: string, log?: ToolingLog) {
    this.log = log || new ToolingLog();
    this.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-report-'));
    this.reportName = reportName;
  }

  /**
   * Defensive utility function used to guard against modifying the report after it has concluded
   *
   * @param additionalInfo Description of the report action that was prevented
   * @protected
   */
  protected raiseIfConcluded(additionalInfo?: string) {
    if (this.concluded) {
      let message = `${this.reportName} at ${this.workDir} was concluded`;

      if (additionalInfo) {
        message += `: ${additionalInfo}`;
      }

      throw new ScoutReportError(message);
    }
  }

  /**
   * Call this when you're done adding information to this report.
   *
   * ⚠️**This will delete all the contents of the report's working directory**
   */
  conclude() {
    // Remove the working directory
    this.log.info(`Removing ${this.reportName} working directory ${this.workDir}`);
    fs.rmSync(this.workDir, { recursive: true, force: true });

    // Mark this report as concluded
    this.concluded = true;
    this.log.success(`${this.reportName} has concluded.`);
  }
}
