/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ValidationIssue, ValidationOutcome } from './types';

export interface JsonReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    issues: number;
  };
  source: string;
  files: ValidationOutcome[];
}

const relativize = (file: string): string => {
  const rel = Path.relative(process.cwd(), file);
  return rel === '' || rel.startsWith('..') ? file : rel;
};

const formatIssue = (issue: ValidationIssue): string => {
  if (issue.source === 'liquid') {
    const location = issue.line != null ? `${issue.line}:${issue.column ?? 1}` : '';
    return `[liquid] ${location ? `${location} ` : ''}${issue.message}`;
  }
  const location = issue.path ? `${issue.path}: ` : '';
  return `[${issue.source}] ${location}${issue.message}`;
};

/** Print a single file's human-readable result (streamed as validation progresses). */
export const printFileResult = (log: ToolingLog, outcome: ValidationOutcome): void => {
  const label = relativize(outcome.file);
  if (outcome.ok) {
    log.success(`PASS  ${label}`);
    return;
  }
  log.error(`FAIL  ${label}`);
  for (const issue of outcome.issues) {
    log.error(`        ${formatIssue(issue)}`);
  }
};

/** Print the closing summary line for a completed run. */
export const printSummary = (log: ToolingLog, outcomes: ValidationOutcome[]): void => {
  const passed = outcomes.filter((outcome) => outcome.ok).length;
  const failed = outcomes.length - passed;
  const summary = `Validated ${outcomes.length} file(s): ${passed} passed, ${failed} failed.`;
  if (failed > 0) {
    log.error(summary);
  } else {
    log.success(summary);
  }
};

export const buildJsonReport = (source: string, outcomes: ValidationOutcome[]): JsonReport => {
  const passed = outcomes.filter((outcome) => outcome.ok).length;
  const issues = outcomes.reduce((total, outcome) => total + outcome.issues.length, 0);
  return {
    summary: {
      total: outcomes.length,
      passed,
      failed: outcomes.length - passed,
      issues,
    },
    source,
    files: outcomes,
  };
};

/** Write the structured JSON report to disk, creating parent dirs as needed. */
export const writeJsonReport = (
  outputPath: string,
  source: string,
  outcomes: ValidationOutcome[]
): void => {
  const absolute = Path.resolve(outputPath);
  fs.mkdirSync(Path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(buildJsonReport(source, outcomes), null, 2)}\n`);
};
