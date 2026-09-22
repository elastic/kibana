/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import path from 'node:path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import stripANSI from 'strip-ansi';
import type { ScoutPlaywrightReporterOptions } from '../scout_playwright_reporter';

const SUITE_PATH_SEPARATOR = ' > ';
const FAILURE_STATUSES = new Set(['failed', 'timedOut', 'interrupted']);

interface FailureAttachments {
  screenshots: string[];
  errorContext?: string;
}

interface FailureEntry {
  suitePath: string[];
  testTitle: string;
  filePath: string;
  errorMessage: string;
  attachments: FailureAttachments;
  status: string;
}

const STATUS_TAGS: Record<string, string> = {
  timedOut: '[timeout]',
  interrupted: '[interrupted]',
};

/**
 * Extracts the raw error message from a test result, trying `error` first
 * then falling back to the `errors` array. Preserves ANSI colors from Playwright.
 */
const getErrorMessage = (result: TestResult): string => {
  const message = result.error?.message ?? result.errors.find((e) => e.message)?.message;
  return message ?? statusFallbackMessage(result.status);
};

const extractAttachments = (result: TestResult): FailureAttachments => {
  const screenshots = result.attachments
    .filter((a) => a.contentType.startsWith('image/') && a.path)
    .map((a) => a.path!);

  const errorContextAttachment = result.attachments.find((a) =>
    a.path?.endsWith('error-context.md')
  );

  return {
    screenshots,
    errorContext: errorContextAttachment?.path,
  };
};

const statusFallbackMessage = (status: string): string => {
  switch (status) {
    case 'timedOut':
      return 'Test timed out';
    case 'interrupted':
      return 'Test interrupted';
    default:
      return 'Test failed';
  }
};

/**
 * Scout Failure Summary reporter
 *
 * Prints a concise, grouped summary of test failures to stdout at the end of a run.
 * Local development aid only — disabled in CI.
 */
export class ScoutFailureSummaryReporter implements Reporter {
  private readonly log: ToolingLog;
  private readonly failures: FailureEntry[] = [];

  constructor(_reporterOptions: ScoutPlaywrightReporterOptions = {}) {
    this.log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
  }

  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (!FAILURE_STATUSES.has(result.status)) {
      return;
    }

    const titleSegments = test.titlePath().slice(3);

    const testTitle =
      titleSegments.length > 0 ? titleSegments[titleSegments.length - 1] : test.title;
    const suitePath = titleSegments.length > 1 ? titleSegments.slice(0, -1) : [];
    const filePath = `${path.relative(REPO_ROOT, test.location.file)}:${test.location.line}`;

    this.failures.push({
      suitePath,
      testTitle,
      filePath: stripANSI(filePath),
      errorMessage: getErrorMessage(result),
      attachments: extractAttachments(result),
      status: result.status,
    });
  }

  onEnd(_result: FullResult) {
    if (this.failures.length === 0) {
      return;
    }

    const grouped = groupBySuitePath(this.failures);

    this.log.write('');
    this.log.write('Scout failure summary:');
    this.log.write('');

    for (const [suiteKey, entries] of grouped) {
      if (suiteKey.length > 0) {
        this.log.write(suiteKey);
      }

      this.log.indent(2, () => {
        for (const entry of entries) {
          const statusTag = STATUS_TAGS[entry.status];
          const titleLine = statusTag
            ? `\u2717 ${entry.testTitle}  ${statusTag}`
            : `\u2717 ${entry.testTitle}`;

          this.log.write(titleLine);
          this.log.indent(2, () => {
            this.log.write(entry.filePath);
            this.log.write('');
            this.log.write(entry.errorMessage);
            this.log.write('');
            for (const screenshotPath of entry.attachments.screenshots) {
              this.log.write(`screenshot: ${screenshotPath}`);
            }
            if (entry.attachments.errorContext) {
              this.log.write(`error context: ${entry.attachments.errorContext}`);
            }
          });
          this.log.write('');
        }
      });
    }

    this.log.write(`${this.failures.length} test(s) failed.`);
  }
}

const groupBySuitePath = (failures: FailureEntry[]): Map<string, FailureEntry[]> => {
  const grouped = new Map<string, FailureEntry[]>();

  for (const failure of failures) {
    const key = failure.suitePath.join(SUITE_PATH_SEPARATOR);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(failure);
    } else {
      grouped.set(key, [failure]);
    }
  }

  return grouped;
};
