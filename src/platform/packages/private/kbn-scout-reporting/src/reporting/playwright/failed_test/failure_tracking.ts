/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';
import type { TestFailure } from '../../report/failed_test/test_failure';

export interface ScoutFailureTrackingEntry {
  id: string;
  suite: string;
  title: string;
  target: string;
  command: string;
  location: string;
  owner: string[];
  kibanaModule?: {
    id: string;
    type: string;
    visibility: string;
    group: string;
  };
  duration: number;
  error: {
    message?: string;
    stack_trace?: string;
  };
  stdout?: string;
  attachments: Array<{
    name: string;
    path?: string;
    contentType: string;
  }>;
  timestamp: string;
  buildkite?: {
    buildId?: string;
    jobId?: string;
    pipeline?: string;
    branch?: string;
  };
}

export class ScoutFailureTracker {
  private readonly log: ToolingLog;
  private readonly trackingFilePath: string;
  private failures: ScoutFailureTrackingEntry[] = [];

  constructor(log: ToolingLog, reportRootPath: string, runId: string) {
    this.log = log;
    // Use the same runId as the main Scout reporting system for consistency
    this.trackingFilePath = path.join(reportRootPath, `scout-failures-${runId}.ndjson`);
  }

  /**
   * Add a test failure to the tracking file
   */
  addFailure(failure: TestFailure) {
    const trackingEntry: ScoutFailureTrackingEntry = {
      id: failure.id,
      suite: failure.suite,
      title: failure.title,
      target: failure.target,
      command: failure.command,
      location: failure.location,
      owner: failure.owner,
      kibanaModule: failure.kibanaModule,
      duration: failure.duration,
      error: failure.error,
      stdout: failure.stdout,
      attachments: failure.attachments,
      timestamp: new Date().toISOString(),
      buildkite: {
        buildId: process.env.BUILDKITE_BUILD_ID,
        jobId: process.env.BUILDKITE_JOB_ID,
        pipeline: process.env.BUILDKITE_PIPELINE_SLUG,
        branch: process.env.BUILDKITE_BRANCH,
      },
    };

    this.failures.push(trackingEntry);
  }

  /**
   * Save all tracked failures to the tracking file
   */
  save() {
    if (this.failures.length === 0) {
      this.log.info('No Scout failures to track');
      return;
    }

    // Ensure directory exists
    const dir = path.dirname(this.trackingFilePath);
    fs.mkdirSync(dir, { recursive: true });

    // Write failures as NDJSON
    const content = this.failures.map((failure) => JSON.stringify(failure)).join('\n') + '\n';

    fs.writeFileSync(this.trackingFilePath, content, 'utf-8');

    this.log.info(
      `Saved ${this.failures.length} Scout failures to tracking file: ${this.trackingFilePath}`
    );
  }

  /**
   * Get the path to the tracking file
   */
  getTrackingFilePath(): string {
    return this.trackingFilePath;
  }
}
