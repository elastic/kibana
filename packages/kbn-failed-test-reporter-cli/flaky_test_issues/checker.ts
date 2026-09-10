/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestReport } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import type { GithubApi, GithubIssue } from '../failed_tests_reporter/github_api';
import {
  describeFailedTestIssue,
  findRelatedFailedTestIssues,
  type FailedTestIssueMatch,
} from './failed_test_issues';
import { readSuiteFilePath } from './issue_title';
import { groupIntoSuites } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, `/skip` and the stale sweep.
 */
export const FAILED_TEST_LABEL = 'failed-test';

export interface CheckFlakySuiteIssuesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
}

export interface IssueRef {
  number: number;
  url: string;
  title: string;
}

export type FlakySuiteIssueStatus =
  /** An open issue about the whole suite exists (`Flaky … test suite: <file>`). */
  | { status: 'tracked'; filePath: string; issue: IssueRef }
  /** No suite issue, but open per-test `failed-test` issues are about this file. */
  | {
      status: 'related';
      filePath: string;
      issues: Array<IssueRef & { match: FailedTestIssueMatch }>;
    }
  /** No open issue mentions the suite at all. */
  | { status: 'untracked'; filePath: string };

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  suites: number;
  /** Open `failed-test` issues that were checked. */
  openIssues: number;
  counts: Record<FlakySuiteIssueStatus['status'], number>;
  results: FlakySuiteIssueStatus[];
}

const toRef = ({ number, html_url: url, title }: GithubIssue): IssueRef => ({ number, url, title });

/** Index of open flaky suite issues by the suite file path in their title; newest wins. */
export const indexSuiteIssues = (issues: readonly GithubIssue[]): Map<string, GithubIssue> => {
  const byFilePath = new Map<string, GithubIssue>();
  for (const issue of issues) {
    const filePath = readSuiteFilePath(issue.title);
    if (!filePath) {
      continue;
    }
    const current = byFilePath.get(filePath);
    if (!current || issue.number > current.number) {
      byFilePath.set(filePath, issue);
    }
  }
  return byFilePath;
};

/**
 * Tells, for every flaky suite in the report, whether an open GitHub issue already tracks it:
 * a suite issue, per-test `failed-test` issues, or nothing. Read-only: nothing is filed,
 * edited or commented on.
 */
export const checkFlakySuiteIssues = async ({
  report,
  github,
  log,
}: CheckFlakySuiteIssuesOptions): Promise<FlakySuiteIssuesSummary> => {
  const suites = groupIntoSuites(report.flaky);
  log.info(`${report.flaky.length} flaky tests in ${suites.length} suites`);

  const openIssues = await github.listIssues({ labels: [FAILED_TEST_LABEL], state: 'open' });
  const suiteIssues = indexSuiteIssues(openIssues);
  const suiteIssueNumbers = new Set([...suiteIssues.values()].map(({ number }) => number));
  const testIssues = openIssues
    .filter(({ number }) => !suiteIssueNumbers.has(number))
    .map(describeFailedTestIssue);
  log.info(
    `Found ${openIssues.length} open ${FAILED_TEST_LABEL} issues, ${suiteIssues.size} of them about a flaky suite`
  );

  const results: FlakySuiteIssueStatus[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = { tracked: 0, related: 0, untracked: 0 };

  for (const suite of suites) {
    const { filePath } = suite;
    const suiteIssue = suiteIssues.get(filePath);
    if (suiteIssue) {
      log.info(`tracked by #${suiteIssue.number}: ${filePath}`);
      results.push({ status: 'tracked', filePath, issue: toRef(suiteIssue) });
      counts.tracked += 1;
      continue;
    }

    const related = findRelatedFailedTestIssues(suite, testIssues);
    if (related.length > 0) {
      const numbers = related.map(({ issue, match }) => `#${issue.number} (${match})`).join(', ');
      log.info(`related failed-test issues ${numbers}: ${filePath}`);
      results.push({
        status: 'related',
        filePath,
        issues: related.map(({ issue, match }) => ({ ...toRef(issue), match })),
      });
      counts.related += 1;
      continue;
    }

    log.info(`no open issue: ${filePath}`);
    results.push({ status: 'untracked', filePath });
    counts.untracked += 1;
  }

  return {
    generatedAt: report.generatedAt,
    suites: suites.length,
    openIssues: openIssues.length,
    counts,
    results,
  };
};
