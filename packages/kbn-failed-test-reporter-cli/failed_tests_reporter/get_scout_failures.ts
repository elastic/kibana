/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import stripAnsi from 'strip-ansi';
import type { TestFailure } from './get_failures';

// Extended TestFailure type for Scout failures
export interface ScoutTestFailureExtended extends TestFailure {
  id: string;
  target: string;
  location: string;
  duration: number;
  owners: string;
  errorMessage?: string;
  file?: string;
  kibanaModule?: {
    id: string;
    type: string;
    visibility: string;
    group: string;
  };
  attachments?: Array<{
    name: string;
    path?: string;
    contentType: string;
  }>;
}

// Scout Failure Tracking Entry interface
interface ScoutFailureTrackingEntry {
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

const isLikelyIrrelevant = (name: string, failure: string) => {
  // no filters for Scout failures at the moment
  return false;
};

export async function getScoutFailures(reportPath: string): Promise<ScoutTestFailureExtended[]> {
  if (!fs.existsSync(reportPath)) {
    return [];
  }

  const fileContent = fs.readFileSync(reportPath, 'utf-8');
  const failures: ScoutTestFailureExtended[] = [];

  // Parse NDJSON (newline-delimited JSON)
  const lines = fileContent
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      try {
        return JSON.parse(line) as ScoutFailureTrackingEntry;
      } catch (error) {
        // Failed to parse Scout failure tracking line
        return null;
      }
    })
    .filter((entry): entry is ScoutFailureTrackingEntry => entry !== null);

  for (const entry of lines) {
    // Convert Scout failure tracking entry to compatible TestFailure format
    const failure = stripAnsi(entry.error.stack_trace || entry.error.message || '');
    const likelyIrrelevant = isLikelyIrrelevant(entry.title, failure);

    const testFailure: ScoutTestFailureExtended = {
      // Map Scout fields to JUnit-compatible fields
      classname: entry.suite,
      name: entry.title,
      failure,
      likelyIrrelevant,
      errorMessage: entry.error.message ? stripAnsi(entry.error.message) : undefined,
      'system-out': entry.stdout ? stripAnsi(entry.stdout) : undefined,
      owners: entry.owner.join(', '), // Convert array to string
      commandLine: entry.command,

      // Scout-specific metadata
      id: entry.id,
      target: entry.target,
      location: entry.location,
      kibanaModule: entry.kibanaModule,
      duration: entry.duration,
      attachments: entry.attachments,

      // Additional fields for compatibility
      time: String(entry.duration / 1000), // Convert ms to seconds
      file: entry.location,
    };

    failures.push(testFailure);
  }

  return failures;
}

export function getScoutCommandLineFromFailures(failures: ScoutTestFailureExtended[]): string {
  if (failures.length === 0) {
    return '';
  }

  // TODO: Use the command from the first failure as representative
  const firstFailure = failures[0] as TestFailure & { commandLine?: string };
  return firstFailure.commandLine || '';
}
