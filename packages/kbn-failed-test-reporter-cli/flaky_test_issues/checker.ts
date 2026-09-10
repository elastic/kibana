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
import type { ToolingLog } from '@kbn/tooling-log';
import type { GithubApi, GithubIssue, GithubIssueState } from '../failed_tests_reporter/github_api';
import { describeIssue, findMatchingIssues, type IssueMatch } from './match_issues';
import { groupIntoSuites, type FlakySuite } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, `/skip` and the stale sweep.
 */
export const FAILED_TEST_LABEL = 'failed-test';

/**
 * GitHub rejects search queries longer than 256 characters; `GithubApi` prepends
 * `repo:<owner>/<name> is:issue ` (up to ~50 characters for the repositories we use).
 */
const MAX_QUERY_LENGTH = 200;

/** GitHub also rejects search queries with more than five `AND` / `OR` / `NOT` operators. */
const MAX_QUERY_TERMS = 6;

export interface CheckFlakySuiteIssuesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
}

export interface MatchedIssueRef {
  number: number;
  url: string;
  title: string;
  state: GithubIssueState;
  match: IssueMatch;
}

export type FlakySuiteIssueStatus =
  /** Issues about the suite exist, open or closed; strongest match first. */
  | { status: 'tracked'; filePath: string; issues: MatchedIssueRef[] }
  /** No issue mentions the suite at all. */
  | { status: 'untracked'; filePath: string };

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  suites: number;
  /** `failed-test` issues, open or closed, that mention one of the suites' file names. */
  candidateIssues: number;
  counts: Record<FlakySuiteIssueStatus['status'], number>;
  results: FlakySuiteIssueStatus[];
}

/**
 * Search queries that together return every `failed-test` issue mentioning one of the suites'
 * file names, as few as the query length and operator limits allow. The file name rather than
 * the path so that issues about a moved file, or with JUnit's `path·ts` spelling, are found too;
 * the matching rules then sort out which suite, if any, an issue is really about.
 */
export const suiteSearchQueries = (
  suites: readonly Pick<FlakySuite, 'filePath'>[],
  { maxLength = MAX_QUERY_LENGTH, maxTerms = MAX_QUERY_TERMS } = {}
): string[] => {
  const prefix = `label:${FAILED_TEST_LABEL} `;
  const terms = [...new Set(suites.map(({ filePath }) => `"${Path.basename(filePath)}"`))];

  const queries: string[] = [];
  let current = '';
  let currentTerms = 0;
  for (const term of terms) {
    const next = current ? `${current} OR ${term}` : `${prefix}${term}`;
    if (current && (next.length > maxLength || currentTerms >= maxTerms)) {
      queries.push(current);
      current = `${prefix}${term}`;
      currentTerms = 1;
    } else {
      current = next;
      currentTerms++;
    }
  }
  if (current) {
    queries.push(current);
  }
  return queries;
};

/**
 * Tells, for every flaky suite in the report, which GitHub `failed-test` issues are about it,
 * open or closed: a suite issue or per-test issues. Read-only: nothing is filed, edited or
 * commented on.
 */
export const checkFlakySuiteIssues = async ({
  report,
  github,
  log,
}: CheckFlakySuiteIssuesOptions): Promise<FlakySuiteIssuesSummary> => {
  const suites = groupIntoSuites(report.flaky);
  log.info(`${report.flaky.length} flaky tests in ${suites.length} suites`);

  const queries = suiteSearchQueries(suites);
  const candidates = new Map<number, GithubIssue>();
  for (const query of queries) {
    for (const issue of await github.searchIssues({ query })) {
      candidates.set(issue.number, issue);
    }
  }
  log.info(
    `Found ${candidates.size} ${FAILED_TEST_LABEL} issues mentioning a flaky suite's file name ` +
      `in ${queries.length} searches`
  );
  const details = [...candidates.values()].map(describeIssue);

  const results: FlakySuiteIssueStatus[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = { tracked: 0, untracked: 0 };

  for (const suite of suites) {
    const { filePath } = suite;
    const matches = findMatchingIssues(suite, details);
    if (matches.length === 0) {
      log.info(`no issue: ${filePath}`);
      results.push({ status: 'untracked', filePath });
      counts.untracked += 1;
      continue;
    }

    const refs = matches.map(({ issue, match }) => `#${issue.number} (${match}, ${issue.state})`);
    log.info(`tracked by ${refs.join(', ')}: ${filePath}`);
    results.push({
      status: 'tracked',
      filePath,
      issues: matches.map(({ issue: { number, html_url: url, title, state }, match }) => ({
        number,
        url,
        title,
        state,
        match,
      })),
    });
    counts.tracked += 1;
  }

  return {
    generatedAt: report.generatedAt,
    suites: suites.length,
    candidateIssues: candidates.size,
    counts,
    results,
  };
};
