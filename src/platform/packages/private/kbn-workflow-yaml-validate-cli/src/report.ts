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
import type { IssueSource, ValidationIssue, ValidationOutcome } from './types';
import { isErrorIssue } from './types';

export interface JsonReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    /** Total warning-severity issues across all files (do not fail the run). */
    warnings: number;
    issues: number;
  };
  source: string;
  files: ValidationOutcome[];
}

/** Display labels for issue sources whose token differs from what we print. */
const SOURCE_LABELS: Partial<Record<IssueSource, string>> = {
  'liquidjs-expression': 'liquidjs exp',
};

const sourceLabel = (source: IssueSource): string => SOURCE_LABELS[source] ?? source;

const countWarnings = (outcomes: ValidationOutcome[]): number =>
  outcomes.reduce(
    (total, outcome) => total + outcome.issues.filter((issue) => !isErrorIssue(issue)).length,
    0
  );

const pluralize = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

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
  return `[${sourceLabel(issue.source)}] ${location}${issue.message}`;
};

/** Print one issue, routing warnings to `log.warning` and errors to `log.error`. */
const printIssue = (log: ToolingLog, issue: ValidationIssue): void => {
  const line = `        ${formatIssue(issue)}`;
  if (isErrorIssue(issue)) {
    log.error(line);
  } else {
    log.warning(line);
  }
};

/** Print a single file's human-readable result (streamed as validation progresses). */
export const printFileResult = (log: ToolingLog, outcome: ValidationOutcome): void => {
  const label = relativize(outcome.file);
  if (outcome.ok) {
    const warnings = outcome.issues.filter((issue) => !isErrorIssue(issue));
    if (warnings.length === 0) {
      log.success(`PASS  ${label}`);
      return;
    }
    log.warning(`PASS  ${label} (${pluralize(warnings.length, 'warning')})`);
    for (const issue of warnings) {
      printIssue(log, issue);
    }
    return;
  }
  log.error(`FAIL  ${label}`);
  for (const issue of outcome.issues) {
    printIssue(log, issue);
  }
};

/** Print the closing summary line for a completed run. */
export const printSummary = (log: ToolingLog, outcomes: ValidationOutcome[]): void => {
  const passed = outcomes.filter((outcome) => outcome.ok).length;
  const failed = outcomes.length - passed;
  const warnings = countWarnings(outcomes);
  const warningNote = warnings > 0 ? ` (${pluralize(warnings, 'warning')})` : '';
  const summary = `Validated ${outcomes.length} file(s): ${passed} passed, ${failed} failed${warningNote}.`;
  if (failed > 0) {
    log.error(summary);
  } else if (warnings > 0) {
    log.warning(summary);
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
      warnings: countWarnings(outcomes),
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
