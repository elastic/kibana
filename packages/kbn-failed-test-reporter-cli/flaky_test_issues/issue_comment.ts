/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { FlakyTestReport } from '@kbn/scout-reporting';
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  FLAKY_TEST_SUITE_METADATA_PREFIX,
  rankTierLabel,
  type FlakySuiteReportSnapshot,
} from './issue_body';
import {
  codeBlock,
  formatBuildLink,
  formatDay,
  formatFailedBuilds,
  formatFailureMessage,
  formatPercent,
  formatWindow,
  inlineCode,
  latestSampleFailure,
  plural,
  testsTable,
} from './markdown';
import type { IssueMatch } from './match_issues';
import type { FlakySuite } from './suites';

const MAX_TEST_ROWS = 15;

export interface FlakySuiteCommentContext {
  report: FlakyTestReport;
  /** How the issue relates to the suite: its own issue, or one of its tests' issues. */
  match: Exclude<IssueMatch, 'file'>;
  /** Why the comment is posted. */
  kind: 'still-flaky' | 'reopened';
  /** For `reopened`: when the issue had been closed and how many builds failed since. */
  closedAt?: Date;
  failedBuildsSinceClosed?: number;
  /** Numbers of the previous report that found the suite flaky, when known. */
  previous?: FlakySuiteReportSnapshot;
  /** Other issues about the suite that are not commented on. */
  otherIssues?: Array<{ number: number; match: IssueMatch }>;
}

/** Hidden in every comment; how later runs find the previous numbers and the comment cadence. */
export interface FlakySuiteCommentMetadata {
  'report.generatedAt': string;
  'report.builds': number;
  'report.failedBuilds': number;
}

const MATCH_LABELS: Record<IssueMatch, string> = {
  suite: 'suite issue',
  test: 'per-test issue',
  moved: 'per-test issue, previous location',
  file: 'mentions the file',
};

/** Snapshot recorded in a comment, if this reporter wrote it. */
export const readFlakySuiteCommentMetadata = (
  body: string
): FlakySuiteReportSnapshot | undefined => {
  const read = (key: keyof FlakySuiteCommentMetadata): unknown =>
    getIssueMetadata(body, key, undefined, FLAKY_TEST_SUITE_METADATA_PREFIX);
  const generatedAt = read('report.generatedAt');
  const builds = read('report.builds');
  const failedBuilds = read('report.failedBuilds');
  if (typeof generatedAt !== 'string' || typeof builds !== 'number') {
    return undefined;
  }
  return { generatedAt, builds, failedBuilds: typeof failedBuilds === 'number' ? failedBuilds : 0 };
};

const lead = (suite: FlakySuite, ctx: FlakySuiteCommentContext): string => {
  const [worst] = suite.tests;
  const numbers =
    `**${worst.failedBuilds} / ${worst.builds} builds (${formatPercent(worst.buildFailRate)})** ` +
    `${formatWindow(ctx.report)}, ${rankTierLabel(worst, ctx.report)}.`;

  const sentences: string[] = [];
  if (ctx.kind === 'reopened') {
    const since = ctx.closedAt ? ` since it was closed on ${formatDay(ctx.closedAt)}` : '';
    const failures =
      ctx.failedBuildsSinceClosed !== undefined
        ? `after ${plural(ctx.failedBuildsSinceClosed, 'failed build')}${since}`
        : `after failing again${since}`;
    sentences.push(`Reopened: still flaky ${failures}.`, numbers);
  } else if (ctx.match === 'suite') {
    sentences.push(`Still flaky: ${numbers}`);
  } else {
    const where =
      ctx.match === 'moved'
        ? `its suite, now at ${inlineCode(suite.filePath)}`
        : `its suite ${inlineCode(Path.basename(suite.filePath))}`;
    sentences.push(`This test is in today's flaky test report for ${where}: ${numbers}`);
  }

  if (ctx.previous) {
    const { generatedAt, builds, failedBuilds } = ctx.previous;
    sentences.push(
      `Previous report (${formatDay(new Date(generatedAt))}): ${formatFailedBuilds(
        failedBuilds,
        builds
      )}.`
    );
  }
  return sentences.join(' ');
};

const latestFailure = (suite: FlakySuite): string | undefined => {
  const latest = latestSampleFailure(suite.tests);
  if (!latest) {
    return undefined;
  }
  const message = formatFailureMessage(latest.message);
  return [
    `Latest failure: ${formatBuildLink(latest.buildUrl, latest.timestamp)}`,
    ...(message.length > 0 ? [codeBlock(message)] : []),
  ].join('\n\n');
};

const alsoTrackedBy = (ctx: FlakySuiteCommentContext): string | undefined =>
  ctx.otherIssues && ctx.otherIssues.length > 0
    ? `Also tracked by ${ctx.otherIssues
        .map(({ number, match }) => `#${number} (${MATCH_LABELS[match]})`)
        .join(', ')}.`
    : undefined;

/** Comment telling that the suite is still in the flaky test report, with today's numbers. */
export const renderFlakySuiteComment = (
  suite: FlakySuite,
  ctx: FlakySuiteCommentContext
): string => {
  const [worst] = suite.tests;
  const sections = [
    lead(suite, ctx),
    testsTable(suite.tests, { withTestId: false, maxRows: MAX_TEST_ROWS }),
    latestFailure(suite),
    alsoTrackedBy(ctx),
  ];
  const metadata: FlakySuiteCommentMetadata = {
    'report.generatedAt': ctx.report.generatedAt.toISOString(),
    'report.builds': worst.builds,
    'report.failedBuilds': worst.failedBuilds,
  };
  return updateIssueMetadata(
    sections.filter((section) => section !== undefined).join('\n\n'),
    metadata,
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
};
