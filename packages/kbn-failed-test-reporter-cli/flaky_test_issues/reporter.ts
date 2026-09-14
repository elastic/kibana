/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTeamByGithubHandle } from '@kbn/code-owners';
import type { FlakyTestReport } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DEFAULT_GITHUB_REPO,
  issueLabelNames,
  type GithubApi,
  type GithubIssue,
  type GithubIssueState,
} from '../failed_tests_reporter/github_api';
import {
  bumpFlakySuiteIssueMetadata,
  flakySuiteIssueTitle,
  readFlakySuiteIssueMetadata,
  renderFlakySuiteIssueBody,
  type FlakySuiteReportSnapshot,
} from './issue_body';
import { readFlakySuiteCommentMetadata, renderFlakySuiteComment } from './issue_comment';
import {
  candidateIssues,
  describeIssue,
  findMatchingIssues,
  indexIssues,
  type IssueMatch,
  type MatchedIssue,
} from './match_issues';
import { moduleLabelForPath } from './module_label';
import { groupIntoSuites, type FlakySuite } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, `/skip` and the stale sweep.
 */
export const FAILED_TEST_LABEL = 'failed-test';
/** Set by `/skip`: the test is skipped, so telling that it is still flaky would be noise. */
export const SKIPPED_TEST_LABEL = 'skipped-test';
/** Failed builds a closed issue's suite must have collected since the closing to be reopened. */
export const MIN_FAILED_BUILDS_TO_REOPEN = 2;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ReportFlakySuiteIssuesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
  /** `owner/name` the issues live in; team labels are only added for `elastic/kibana`. */
  githubRepo: string;
  /**
   * Closed issues updated before this time are not fetched and so never count as tracking a
   * suite; every open issue does, however old.
   */
  closedSince: Date;
  /** Suite issues created per run, worst suites first; the rest is reported as skipped. */
  maxNewIssues: number;
  /** An issue is commented on at most once per this many days. */
  minCommentIntervalDays: number;
  dryRun: boolean;
  dashboardUrl?: string;
  /** Module named in the title of a new issue; defaults to the owning `kibana.jsonc`. */
  moduleLabel?: (filePath: string) => string | undefined;
}

export interface IssueRef {
  number: number;
  url: string;
  title: string;
  state: GithubIssueState;
}

export type SkipReason =
  /** The suite has no issue, but this run already created `maxNewIssues`. */
  | 'max-new-issues'
  /** The issue got a report comment less than `minCommentIntervalDays` ago. */
  | 'recently-commented'
  /** The issue carries the `skipped-test` label. */
  | 'skipped-test'
  /** The issue is closed and fewer than `MIN_FAILED_BUILDS_TO_REOPEN` builds failed since. */
  | 'closed-before-failures';

export type FlakySuiteAction =
  | { action: 'created'; filePath: string; issue: IssueRef }
  | { action: 'commented'; filePath: string; issue: IssueRef; match: IssueMatch }
  | { action: 'reopened'; filePath: string; issue: IssueRef; match: IssueMatch }
  | { action: 'skipped'; filePath: string; reason: SkipReason; issue?: IssueRef; match?: IssueMatch }
  | {
      action: 'failed';
      filePath: string;
      attempted: 'create' | 'comment' | 'reopen';
      error: string;
      issue?: IssueRef;
      match?: IssueMatch;
    };

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  dryRun: boolean;
  githubRepo: string;
  suites: number;
  /** `failed-test` issues checked: every open one and the closed ones updated since `closedSince`. */
  issues: { open: number; closed: number; closedSince: Date };
  counts: Record<FlakySuiteAction['action'], number>;
  actions: FlakySuiteAction[];
}

/** A match that means the issue is about the suite; `file` matches only mention its file. */
type TrackingMatch = Exclude<IssueMatch, 'file'>;
interface TrackingIssue extends MatchedIssue {
  match: TrackingMatch;
}
const isTracking = (matched: MatchedIssue): matched is TrackingIssue => matched.match !== 'file';

const issueRef = ({ number, html_url: url, title, state }: GithubIssue): IssueRef => ({
  number,
  url,
  title,
  state,
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Every open `failed-test` issue plus the closed ones updated since `closedSince`, via the issue
 * listing rather than the search API: no result cap, no query length limit and only the core
 * rate limit, so a few thousand issues cost under a hundred requests. Matching happens locally.
 */
const fetchFailedTestIssues = async (
  github: GithubApi,
  closedSince: Date,
  log: ToolingLog
): Promise<{ issues: GithubIssue[]; open: number; closed: number }> => {
  const requestsBefore = github.getRequestCount();
  const open = await github.listIssues({ state: 'open', labels: [FAILED_TEST_LABEL] });
  log.info(`Fetched ${open.length} open ${FAILED_TEST_LABEL} issues`);

  // Ascending by update time so issues updated while paging land on later pages, not earlier ones
  const closed = await github.listIssues({
    state: 'closed',
    labels: [FAILED_TEST_LABEL],
    since: closedSince,
    sort: 'updated',
    direction: 'asc',
  });
  log.info(
    `Fetched ${closed.length} ${FAILED_TEST_LABEL} issues closed and updated since ` +
      `${closedSince.toISOString()} (${
        github.getRequestCount() - requestsBefore
      } requests in total)`
  );

  // An issue closed between the two listings is in both; keep the later, closed, version
  const byNumber = new Map<number, GithubIssue>();
  for (const issue of [...open, ...closed]) {
    byNumber.set(issue.number, issue);
  }
  return { issues: [...byNumber.values()], open: open.length, closed: closed.length };
};

/** `failed-test` plus the label of each owning team, the latter only in the Kibana repository. */
export const issueLabels = (suite: FlakySuite, githubRepo: string): string[] => {
  if (githubRepo !== DEFAULT_GITHUB_REPO) {
    return [FAILED_TEST_LABEL];
  }
  const teamLabels = suite.owners
    .map((owner) => getTeamByGithubHandle(owner)?.github.label)
    .filter((label): label is string => label !== undefined);
  return [...new Set([FAILED_TEST_LABEL, ...teamLabels])];
};

/**
 * Failed builds of the suite on the days fully after `closedAt`, from the daily trend: the
 * largest count among its tests per day, so a build failing several tests counts once.
 * Undefined when the report carries no trend.
 */
export const failedBuildsSince = (suite: FlakySuite, closedAt: Date): number | undefined => {
  const perDay = new Map<number, number>();
  let hasTrend = false;
  for (const { trend } of suite.tests) {
    if (!trend) {
      continue;
    }
    hasTrend = true;
    trend.failedBuildsPerDay.forEach((failed, index) => {
      const dayStart = trend.from.getTime() + index * MS_PER_DAY;
      if (dayStart >= closedAt.getTime()) {
        perDay.set(dayStart, Math.max(perDay.get(dayStart) ?? 0, failed));
      }
    });
  }
  if (!hasTrend) {
    return undefined;
  }
  return [...perDay.values()].reduce((sum, failed) => sum + failed, 0);
};

const newest = (
  snapshots: Array<FlakySuiteReportSnapshot | undefined>
): FlakySuiteReportSnapshot | undefined =>
  snapshots
    .filter((snap): snap is FlakySuiteReportSnapshot => snap !== undefined)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];

/**
 * Files, comments on or reopens GitHub `failed-test` issues for the flaky suites of a report:
 * a suite without any issue gets one (up to `maxNewIssues` per run), a suite with an open issue
 * (its own or one of its tests') gets a still-flaky comment at most every
 * `minCommentIntervalDays`, a suite whose issue was closed but kept failing gets it reopened.
 * A failed write is recorded and the run goes on with the next suite.
 */
export const reportFlakySuiteIssues = async (
  options: ReportFlakySuiteIssuesOptions
): Promise<FlakySuiteIssuesSummary> => {
  const { report, github, log, githubRepo, closedSince, maxNewIssues, dryRun } = options;
  const moduleLabel = options.moduleLabel ?? moduleLabelForPath;
  const suites = groupIntoSuites(report.flaky, report.files);
  log.info(
    `${report.flaky.length} flaky tests in ${suites.length} suites${dryRun ? ' (dry run)' : ''}`
  );

  const { issues, open, closed } = await fetchFailedTestIssues(github, closedSince, log);
  const index = indexIssues(issues.map(describeIssue));

  const actions: FlakySuiteAction[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = {
    created: 0,
    commented: 0,
    reopened: 0,
    skipped: 0,
    failed: 0,
  };
  const record = (action: FlakySuiteAction) => {
    actions.push(action);
    counts[action.action] += 1;
  };

  const create = async (suite: FlakySuite, related: MatchedIssue[]) => {
    const { filePath } = suite;
    if (counts.created >= maxNewIssues) {
      log.info(`skip, ${maxNewIssues} issues already created this run: ${filePath}`);
      record({ action: 'skipped', filePath, reason: 'max-new-issues' });
      return;
    }
    const title = flakySuiteIssueTitle(suite, moduleLabel(filePath));
    const body = renderFlakySuiteIssueBody(suite, {
      report,
      dashboardUrl: options.dashboardUrl,
      relatedIssues: related.map(({ issue }) => issue.number),
    });
    try {
      const created = await github.createIssue(title, body, issueLabels(suite, githubRepo));
      log.info(`created #${created.number} ${created.html_url}: ${filePath}`);
      record({
        action: 'created',
        filePath,
        issue: { number: created.number, url: created.html_url, title, state: 'open' },
      });
    } catch (error) {
      log.error(`failed to create an issue for ${filePath}: ${errorMessage(error)}`);
      record({ action: 'failed', filePath, attempted: 'create', error: errorMessage(error) });
    }
  };

  const comment = async (suite: FlakySuite, target: TrackingIssue, others: TrackingIssue[]) => {
    const { filePath } = suite;
    const { issue, match } = target;
    const ref = issueRef(issue);
    try {
      const comments = await github.getIssueComments(issue.number, { readInDryRun: true });
      const previous = newest([
        ...comments.map((entry) => readFlakySuiteCommentMetadata(entry.body)),
        ...(match === 'suite'
          ? readFlakySuiteIssueMetadata(issue.body)?.['report.history'] ?? []
          : []),
      ]);
      const intervalMs = options.minCommentIntervalDays * MS_PER_DAY;
      if (
        previous &&
        report.generatedAt.getTime() - new Date(previous.generatedAt).getTime() < intervalMs
      ) {
        log.info(`skip, #${issue.number} got a report on ${previous.generatedAt}: ${filePath}`);
        record({ action: 'skipped', filePath, reason: 'recently-commented', issue: ref, match });
        return;
      }
      const body = renderFlakySuiteComment(suite, {
        report,
        match,
        kind: 'still-flaky',
        previous,
        otherIssues: others.map((other) => ({ number: other.issue.number, match: other.match })),
      });
      if (match === 'suite') {
        await github.editIssueBodyAndEnsureOpen(
          issue.number,
          bumpFlakySuiteIssueMetadata(issue.body, suite, report)
        );
      }
      await github.addIssueComment(issue.number, body);
      log.info(`commented on #${issue.number} (${match}): ${filePath}`);
      record({ action: 'commented', filePath, issue: ref, match });
    } catch (error) {
      log.error(`failed to comment on #${issue.number} for ${filePath}: ${errorMessage(error)}`);
      record({
        action: 'failed',
        filePath,
        attempted: 'comment',
        error: errorMessage(error),
        issue: ref,
        match,
      });
    }
  };

  const reopen = async (suite: FlakySuite, target: TrackingIssue, others: TrackingIssue[]) => {
    const { filePath } = suite;
    const { issue, match } = target;
    const ref = issueRef(issue);
    const closedAt = issue.closed_at ? new Date(issue.closed_at) : undefined;
    const since = closedAt ? failedBuildsSince(suite, closedAt) : undefined;
    const failedAgain =
      since !== undefined
        ? since >= MIN_FAILED_BUILDS_TO_REOPEN
        : !closedAt || suite.tests[0].lastFailedAt > closedAt;
    if (!failedAgain) {
      log.info(
        `skip, #${issue.number} was closed on ${issue.closed_at} and ${since ?? 0} builds failed ` +
          `since: ${filePath}`
      );
      record({ action: 'skipped', filePath, reason: 'closed-before-failures', issue: ref, match });
      return;
    }
    const body = renderFlakySuiteComment(suite, {
      report,
      match,
      kind: 'reopened',
      closedAt,
      failedBuildsSinceClosed: since,
      previous: newest(
        match === 'suite' ? readFlakySuiteIssueMetadata(issue.body)?.['report.history'] ?? [] : []
      ),
      otherIssues: others.map((other) => ({ number: other.issue.number, match: other.match })),
    });
    try {
      if (match === 'suite') {
        await github.editIssueBodyAndEnsureOpen(
          issue.number,
          bumpFlakySuiteIssueMetadata(issue.body, suite, report)
        );
      } else {
        await github.reopenIssue(issue.number);
      }
      await github.addIssueComment(issue.number, body);
      log.info(`reopened #${issue.number} (${match}): ${filePath}`);
      record({ action: 'reopened', filePath, issue: { ...ref, state: 'open' }, match });
    } catch (error) {
      log.error(`failed to reopen #${issue.number} for ${filePath}: ${errorMessage(error)}`);
      record({
        action: 'failed',
        filePath,
        attempted: 'reopen',
        error: errorMessage(error),
        issue: ref,
        match,
      });
    }
  };

  for (const suite of suites) {
    const matches = findMatchingIssues(suite, candidateIssues(suite, index));
    // Issues that merely mention the file are not about the suite; they are linked, not updated
    const tracking = matches.filter(isTracking);
    if (tracking.length === 0) {
      await create(suite, matches);
      continue;
    }

    // Strongest open match, else the strongest closed one; matches come sorted that way
    const target = tracking.find(({ issue }) => issue.state === 'open') ?? tracking[0];
    const others = tracking.filter((candidate) => candidate !== target);
    if (issueLabelNames(target.issue).includes(SKIPPED_TEST_LABEL)) {
      log.info(`skip, #${target.issue.number} is labelled ${SKIPPED_TEST_LABEL}: ${suite.filePath}`);
      record({
        action: 'skipped',
        filePath: suite.filePath,
        reason: 'skipped-test',
        issue: issueRef(target.issue),
        match: target.match,
      });
      continue;
    }
    if (target.issue.state === 'open') {
      await comment(suite, target, others);
    } else {
      await reopen(suite, target, others);
    }
  }

  return {
    generatedAt: report.generatedAt,
    dryRun,
    githubRepo,
    suites: suites.length,
    issues: { open, closed, closedSince },
    counts,
    actions,
  };
};
