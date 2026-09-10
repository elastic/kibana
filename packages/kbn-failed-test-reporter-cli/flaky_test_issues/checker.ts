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
import { FLAKY_TEST_SUITE_TITLE_TERMS, readSuiteFilePath } from './issue_title';
import { groupIntoSuites } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, `/skip` and the stale sweep.
 */
export const FAILED_TEST_LABEL = 'failed-test';

/**
 * Search query for open flaky suite issues. Listing every `failed-test` issue would page through
 * thousands, so the title words narrow it down and the title format confirms the match.
 */
export const suiteIssuesQuery = (): string =>
  `label:${FAILED_TEST_LABEL} is:open in:title ${FLAKY_TEST_SUITE_TITLE_TERMS.map(
    (term) => `"${term}"`
  ).join(' ')}`;

export interface CheckFlakySuiteIssuesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
}

interface IssueRef {
  number: number;
  url: string;
}

export type FlakySuiteIssueStatus =
  | { status: 'tracked'; filePath: string; issue: IssueRef }
  | { status: 'untracked'; filePath: string };

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  suites: number;
  counts: Record<FlakySuiteIssueStatus['status'], number>;
  results: FlakySuiteIssueStatus[];
}

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
 * Tells, for every flaky suite in the report, whether an open GitHub issue already tracks it.
 * Read-only: nothing is filed, edited or commented on.
 */
export const checkFlakySuiteIssues = async ({
  report,
  github,
  log,
}: CheckFlakySuiteIssuesOptions): Promise<FlakySuiteIssuesSummary> => {
  const suites = groupIntoSuites(report.flaky);
  log.info(`${report.flaky.length} flaky tests in ${suites.length} suites`);

  const existing = indexSuiteIssues(await github.searchIssues({ query: suiteIssuesQuery() }));
  log.info(`Found ${existing.size} open flaky suite issues`);

  const results: FlakySuiteIssueStatus[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = { tracked: 0, untracked: 0 };

  for (const { filePath } of suites) {
    const issue = existing.get(filePath);
    if (issue) {
      log.info(`tracked by #${issue.number}: ${filePath}`);
      results.push({
        status: 'tracked',
        filePath,
        issue: { number: issue.number, url: issue.html_url },
      });
      counts.tracked += 1;
      continue;
    }

    log.info(`no open issue: ${filePath}`);
    results.push({ status: 'untracked', filePath });
    counts.untracked += 1;
  }

  return { generatedAt: report.generatedAt, suites: suites.length, counts, results };
};
