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
  FLAKY_TEST_SUITE_TITLE_TERMS,
  flakySuiteIssueTitle,
  readSuiteFilePath,
  renderFlakySuiteIssueBody,
} from './issue_body';
import { groupIntoSuites } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, the failed-test investigator, `/skip`
 * and the stale sweep that closes issues nobody touched for three weeks.
 */
export const FAILED_TEST_LABEL = 'failed-test';

/**
 * Search query for the open issues this reporter filed. Listing every `failed-test` issue would
 * page through thousands, so the title words narrow it down and the metadata footer confirms
 * the match.
 */
export const suiteIssuesQuery = (): string =>
  `label:${FAILED_TEST_LABEL} is:open in:title ${FLAKY_TEST_SUITE_TITLE_TERMS.map(
    (term) => `"${term}"`
  ).join(' ')}`;

export interface ReportFlakySuitesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
  /** Labels put on new issues; must include {@link FAILED_TEST_LABEL} for them to be found again. */
  labels: string[];
  /** Cap on issues created per run, worst suites first. */
  maxNewIssues: number;
  reportUrl?: string;
  /** Recorded in the summary; the `github` client decides whether requests are actually sent. */
  dryRun: boolean;
}

interface IssueRef {
  number: number;
  url: string;
}

export type FlakySuiteIssueAction =
  | { action: 'created' | 'existing'; filePath: string; issue: IssueRef }
  | { action: 'skipped'; filePath: string; reason: 'max-new-issues' };

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  dryRun: boolean;
  suites: number;
  counts: Record<FlakySuiteIssueAction['action'], number>;
  actions: FlakySuiteIssueAction[];
}

const toRef = (issue: Pick<GithubIssue, 'number' | 'html_url'>): IssueRef => ({
  number: issue.number,
  url: issue.html_url,
});

/** Index of the open issues this reporter filed before, by suite file path; newest wins. */
export const indexSuiteIssues = (issues: readonly GithubIssue[]): Map<string, GithubIssue> => {
  const byFilePath = new Map<string, GithubIssue>();
  for (const issue of issues) {
    const filePath = readSuiteFilePath(issue.body);
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
 * Files one GitHub issue per flaky suite in the report that has no open issue yet. Suites with
 * an open issue are left untouched, and so are issues of suites that dropped out of the report.
 */
export const reportFlakySuitesToGithub = async ({
  report,
  github,
  log,
  labels,
  maxNewIssues,
  reportUrl,
  dryRun,
}: ReportFlakySuitesOptions): Promise<FlakySuiteIssuesSummary> => {
  const suites = groupIntoSuites(report.flaky);
  log.info(`${report.flaky.length} flaky tests in ${suites.length} suites`);

  const existing = indexSuiteIssues(await github.searchIssues({ query: suiteIssuesQuery() }));
  log.info(`Found ${existing.size} open flaky suite issues filed earlier`);

  const actions: FlakySuiteIssueAction[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = { created: 0, existing: 0, skipped: 0 };
  const record = (action: FlakySuiteIssueAction) => {
    actions.push(action);
    counts[action.action] += 1;
  };

  for (const suite of suites) {
    const { filePath } = suite;
    const issue = existing.get(filePath);
    if (issue) {
      log.info(`#${issue.number} already tracks ${filePath}`);
      record({ action: 'existing', filePath, issue: toRef(issue) });
      continue;
    }

    if (counts.created >= maxNewIssues) {
      log.info(`Skipping ${filePath}: already created ${maxNewIssues} issues this run`);
      record({ action: 'skipped', filePath, reason: 'max-new-issues' });
      continue;
    }

    const newIssue = await github.createIssue(
      flakySuiteIssueTitle(suite),
      renderFlakySuiteIssueBody(suite, { report, reportUrl }),
      labels
    );
    log.info(`Created #${newIssue.number} for ${filePath}`);
    record({ action: 'created', filePath, issue: toRef(newIssue) });
  }

  return { generatedAt: report.generatedAt, dryRun, suites: suites.length, counts, actions };
};
