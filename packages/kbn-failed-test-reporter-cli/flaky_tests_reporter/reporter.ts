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
  FLAKY_TEST_SUITE_TITLE_PREFIX,
  flakySuiteIssueTitle,
  readReportCount,
  readReportGeneratedAt,
  readReportHistory,
  readSuiteFilePath,
  renderFlakySuiteIssueBody,
  renderReopenComment,
  type RelatedIssue,
} from './issue_body';
import { groupIntoSuites, type FlakySuite } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, the failed-test investigator, `/skip`
 * and the stale sweep that closes issues nobody touched for three weeks.
 */
export const FAILED_TEST_LABEL = 'failed-test';

/**
 * Search query for the issues this reporter filed. Listing every `failed-test` issue would page
 * through tens of thousands of closed ones, so the title prefix narrows it down and the
 * metadata footer confirms the match.
 */
export const suiteIssuesQuery = (): string =>
  `label:${FAILED_TEST_LABEL} in:title "${FLAKY_TEST_SUITE_TITLE_PREFIX.replace(/:$/, '')}"`;

/**
 * What to do with a suite whose tests already have an open `failed-test` issue: `skip` files
 * nothing for it, `link` files the suite issue anyway and lists the related issues in it.
 */
export const FAILED_TEST_ISSUE_POLICIES = ['skip', 'link'] as const;
export type FailedTestIssuePolicy = (typeof FAILED_TEST_ISSUE_POLICIES)[number];

export interface ReportFlakySuitesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
  /** Labels put on new issues; must include {@link FAILED_TEST_LABEL} for them to be found again. */
  labels: string[];
  /** Cap on issues created per run; existing issues are always updated. */
  maxNewIssues: number;
  failedTestIssuePolicy: FailedTestIssuePolicy;
  reportUrl?: string;
  /** Recorded in the summary; the `github` client decides whether requests are actually sent. */
  dryRun: boolean;
}

interface IssueRef {
  number: number;
  url: string;
}

export type FlakySuiteIssueAction =
  | { action: 'created' | 'updated' | 'reopened'; filePath: string; issue: IssueRef }
  | { action: 'skipped'; filePath: string; reason: 'max-new-issues' }
  | { action: 'skipped'; filePath: string; reason: 'failed-test-issue'; relatedIssues: number[] };

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

/**
 * Index of the issues this reporter filed before, by suite file path. Prefers an open issue and
 * otherwise the most recent closed one, so a suite that flares up again reopens its history.
 */
export const indexSuiteIssues = (issues: readonly GithubIssue[]): Map<string, GithubIssue> => {
  const byFilePath = new Map<string, GithubIssue>();
  for (const issue of issues) {
    const filePath = readSuiteFilePath(issue.body);
    if (!filePath) {
      continue;
    }
    const current = byFilePath.get(filePath);
    const preferred =
      !current ||
      (issue.state === 'open' && current.state !== 'open') ||
      (issue.state === current.state && issue.number > current.number);
    if (preferred) {
      byFilePath.set(filePath, issue);
    }
  }
  return byFilePath;
};

/**
 * Per-test `failed-test` issues whose body mentions the suite file. Their bodies carry the file
 * in a `Location` row, whereas titles mangle it (`alerts·ts`), so the body is what gets matched.
 * Issues filed by this reporter share the label and are excluded.
 */
export const relatedFailedTestIssues = (
  suite: Pick<FlakySuite, 'filePath'>,
  failedTestIssues: readonly GithubIssue[]
): RelatedIssue[] =>
  failedTestIssues
    .filter((issue) => !readSuiteFilePath(issue.body) && issue.body.includes(suite.filePath))
    .map(({ number, html_url, title }) => ({ number, html_url, title }));

/**
 * Files one GitHub issue per flaky suite in the report, or brings the existing one up to date.
 * Suites that dropped out of the report are left alone; closing is a human decision.
 */
export const reportFlakySuitesToGithub = async ({
  report,
  github,
  log,
  labels,
  maxNewIssues,
  failedTestIssuePolicy,
  reportUrl,
  dryRun,
}: ReportFlakySuitesOptions): Promise<FlakySuiteIssuesSummary> => {
  const suites = groupIntoSuites(report.flaky);
  log.info(`${report.flaky.length} flaky tests in ${suites.length} suites`);

  const [suiteIssues, failedTestIssues] = await Promise.all([
    github.searchIssues({ query: suiteIssuesQuery() }),
    github.listIssues({ labels: [FAILED_TEST_LABEL], state: 'open' }),
  ]);
  const existing = indexSuiteIssues(suiteIssues);
  log.info(
    `Found ${existing.size} flaky suite issues filed earlier and ` +
      `${failedTestIssues.length} open ${FAILED_TEST_LABEL} issues`
  );

  const actions: FlakySuiteIssueAction[] = [];
  let created = 0;

  for (const suite of suites) {
    const { filePath } = suite;
    const issue = existing.get(filePath);
    const relatedIssues = relatedFailedTestIssues(suite, failedTestIssues);
    // A retried CI step re-applies the same report; that must not count as a new sighting
    const alreadyApplied =
      issue !== undefined && readReportGeneratedAt(issue.body) === report.generatedAt.toISOString();
    const context = {
      report,
      reportUrl,
      relatedIssues,
      reportCount: (issue ? readReportCount(issue.body) : 0) + (alreadyApplied ? 0 : 1),
      history: issue ? readReportHistory(issue.body) : [],
    };

    if (issue) {
      const body = renderFlakySuiteIssueBody(suite, context);
      await github.editIssueBodyAndEnsureOpen(issue.number, body);
      if (issue.state === 'open') {
        log.info(`Updated #${issue.number} for ${filePath}`);
        actions.push({ action: 'updated', filePath, issue: toRef(issue) });
      } else {
        await github.addIssueComment(issue.number, renderReopenComment(suite, report));
        log.info(`Reopened #${issue.number} for ${filePath}`);
        actions.push({ action: 'reopened', filePath, issue: toRef(issue) });
      }
      continue;
    }

    if (relatedIssues.length > 0 && failedTestIssuePolicy === 'skip') {
      const numbers = relatedIssues.map((related) => related.number);
      log.info(`Skipping ${filePath}: tracked by failed-test issue(s) #${numbers.join(', #')}`);
      actions.push({
        action: 'skipped',
        filePath,
        reason: 'failed-test-issue',
        relatedIssues: numbers,
      });
      continue;
    }

    if (created >= maxNewIssues) {
      log.info(`Skipping ${filePath}: already created ${maxNewIssues} issues this run`);
      actions.push({ action: 'skipped', filePath, reason: 'max-new-issues' });
      continue;
    }

    const newIssue = await github.createIssue(
      flakySuiteIssueTitle(suite),
      renderFlakySuiteIssueBody(suite, context),
      labels
    );
    created += 1;
    log.info(`Created #${newIssue.number} for ${filePath}`);
    actions.push({ action: 'created', filePath, issue: toRef(newIssue) });
  }

  const counts: FlakySuiteIssuesSummary['counts'] = {
    created: 0,
    updated: 0,
    reopened: 0,
    skipped: 0,
  };
  for (const { action } of actions) {
    counts[action] += 1;
  }

  return { generatedAt: report.generatedAt, dryRun, suites: suites.length, counts, actions };
};
