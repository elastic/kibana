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
  type GithubApi,
  type GithubIssue,
  type GithubIssueState,
} from '../failed_tests_reporter/github_api';
import {
  flakySuiteIssueTitle,
  readFlakySuiteIssueMetadata,
  renderFlakySuiteIssueBody,
  renderFlakySuiteIssueComment,
  type RecordedFlakySuiteIssueMetadata,
} from './issue_body';
import {
  addIssueToIndex,
  candidateIssues,
  compareMatches,
  describeIssue,
  findMatchingIssues,
  indexIssues,
  type IssueIndex,
  type IssueMatch,
  type MatchedIssue,
} from './match_issues';
import { isPullRequestRef } from './markdown';
import { groupIntoSuites, type FlakySuite } from './suites';

/**
 * Label shared with the issues `report_failed_tests` files for individual failures, so flaky
 * suites flow through the same triage: team labelling, `/skip` and the stale sweep.
 */
export const FAILED_TEST_LABEL = 'failed-test';

/** A repository whose `failed-test` issues are read; `repo` is `owner/name`. */
export interface IssueRepository {
  github: GithubApi;
  repo: string;
}

export interface ReportFlakySuiteIssuesOptions {
  report: FlakyTestReport;
  github: GithubApi;
  log: ToolingLog;
  /** `owner/name` the issues are filed in; team labels are only added for `elastic/kibana`. */
  githubRepo: string;
  /**
   * Repository whose `failed-test` issues also count as tracking a suite, without ever being
   * written to: while the issues are filed in a sandbox, a suite that `elastic/kibana` already
   * has an issue for gets none there. Leave unset when `githubRepo` is that repository, its own
   * issues already gate creation and a second listing would be wasted.
   */
  tracking?: IssueRepository;
  /**
   * Closed issues updated before this time are not fetched and so never count as tracking a
   * suite; every open issue does, however old.
   */
  closedSince: Date;
  /** Suite issues created per run, worst suites first; the rest is reported as skipped. */
  maxNewIssues: number;
  /**
   * Refresh the suite issues of `githubRepo` that the report finds flaky again: the body is
   * rewritten with this report's numbers, a comment posted when the suite failed since the last
   * report, and an issue closed before such a failure reopened. Off, they are skipped as tracked.
   */
  updateIssues: boolean;
  dryRun: boolean;
}

export interface IssueRef {
  number: number;
  url: string;
  title: string;
  state: GithubIssueState;
  /** `owner/name`, set only when the issue is not in `githubRepo`, so `#N` is unambiguous. */
  repo?: string;
}

export type SkipReason =
  /** The suite has no issue, but this run already created `maxNewIssues`. */
  | 'max-new-issues'
  /**
   * Every test of the suite has an issue in `githubRepo`, open or closed: a per-test issue about
   * it, or an issue about the suite or its file. A single test without one gets the suite its issue.
   * A suite issue of its own is refreshed instead, unless it already has this report, or is
   * closed and the suite has not failed since.
   */
  | 'tracked'
  /** Same, for the tracking repository. */
  | 'tracked-upstream';

/** The suite an action is about; several suites of one file are told apart by their title. */
export interface SuiteRef {
  filePath: string;
  suiteTitle?: string;
}

export type FlakySuiteAction = SuiteRef &
  (
    | { action: 'created'; issue: IssueRef }
    /** The suite's own issue got this report's numbers; `commented` on new failures. */
    | { action: 'updated'; issue: IssueRef; commented: boolean; reopened: boolean }
    | { action: 'skipped'; reason: SkipReason; issue?: IssueRef; match?: IssueMatch }
    | { action: 'failed'; attempted: 'create' | 'update'; error: string; issue?: IssueRef }
  );

export interface IssueCounts {
  open: number;
  closed: number;
}

export interface FlakySuiteIssuesSummary {
  generatedAt: Date;
  dryRun: boolean;
  githubRepo: string;
  suites: number;
  /** `failed-test` issues checked: every open one and the closed ones updated since `closedSince`. */
  issues: IssueCounts & {
    closedSince: Date;
    /** Same counts for the tracking repository; absent when there is none. */
    tracking?: IssueCounts & { repo: string };
  };
  counts: Record<FlakySuiteAction['action'], number>;
  actions: FlakySuiteAction[];
}

/** A match that means the issue is about the suite; `file` matches only mention its file. */
const isTracking = (matched: MatchedIssue): boolean => matched.match !== 'file';

/** Strongest open match, else the strongest closed one; matches come sorted that way. */
const strongestTracking = (matches: readonly MatchedIssue[]): MatchedIssue | undefined => {
  const tracking = matches.filter(isTracking);
  return tracking.find(({ issue }) => issue.state === 'open') ?? tracking[0];
};

/**
 * The issue standing in for the suite when every one of its tests has one in the index: an issue
 * about the suite or its file covers them all, a per-test issue only its own test. Undefined as
 * soon as a test has none, that test deserves the suite issue.
 */
const coveringIssue = (suite: FlakySuite, index: IssueIndex): MatchedIssue | undefined => {
  const covering: MatchedIssue[] = [];
  for (const test of suite.tests) {
    const single = { ...suite, tests: [test] };
    const covered = strongestTracking(findMatchingIssues(single, candidateIssues(single, index)));
    if (!covered) {
      return undefined;
    }
    covering.push(covered);
  }
  const distinct = [...new Map(covering.map((match) => [match.issue.number, match])).values()];
  return strongestTracking(distinct.sort(compareMatches));
};

/** An issue this reporter filed for the suite itself, rather than for its whole file. */
const isOwnSuiteIssue = ({ issue, match }: MatchedIssue, suite: FlakySuite): boolean =>
  match === 'suite' &&
  readFlakySuiteIssueMetadata(issue.body)?.['suite.title'] === suite.suiteTitle;

/** The suite's newest failure on a branch of the report scope, pull requests left out. */
const lastFailedAt = (suite: FlakySuite): Date | undefined => {
  let newest: Date | undefined;
  for (const test of suite.tests) {
    for (const { branch, lastFailedAt: failedAt } of test.byBranch) {
      if (failedAt && !isPullRequestRef(branch) && (!newest || failedAt > newest)) {
        newest = failedAt;
      }
    }
  }
  return newest;
};

interface Refresh {
  previous: RecordedFlakySuiteIssueMetadata;
  /** The suite failed since the last report, or since the issue was closed. */
  comment: boolean;
  reopen: boolean;
}

/**
 * What refreshing the suite's own issue takes, or undefined when it already has this report (a
 * rebuild) or is closed and the suite has not failed since: the report window can still hold
 * the failures a fix was merged for. An issue closed as a duplicate stays closed.
 */
const planRefresh = (
  suite: FlakySuite,
  issue: GithubIssue,
  report: FlakyTestReport
): Refresh | undefined => {
  const previous = readFlakySuiteIssueMetadata(issue.body);
  const recordedAt = previous?.['report.generatedAt'];
  if (!previous || (recordedAt && new Date(recordedAt) >= report.generatedAt)) {
    return undefined;
  }
  const failedAt = lastFailedAt(suite);
  if (issue.state === 'closed') {
    const closedAt = issue.closed_at ? new Date(issue.closed_at) : undefined;
    const failedSinceClosed = failedAt && closedAt && failedAt > closedAt;
    return failedSinceClosed && issue.state_reason !== 'duplicate'
      ? { previous, comment: true, reopen: true }
      : undefined;
  }
  return {
    previous,
    comment: failedAt !== undefined && (!recordedAt || failedAt > new Date(recordedAt)),
    reopen: false,
  };
};

const suiteRef = ({ filePath, suiteTitle }: FlakySuite): SuiteRef => ({
  filePath,
  ...(suiteTitle ? { suiteTitle } : {}),
});

/** `path/to/file.spec.ts (suite title)` for the log. */
const describeSuite = ({ filePath, suiteTitle }: FlakySuite): string =>
  suiteTitle ? `${filePath} (${suiteTitle})` : filePath;

const issueRef = (
  { number, html_url: url, title, state }: GithubIssue,
  repo?: string
): IssueRef => ({ number, url, title, state, ...(repo ? { repo } : {}) });

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Every open `failed-test` issue plus the closed ones updated since `closedSince`, via the issue
 * listing rather than the search API: no result cap, no query length limit and only the core
 * rate limit, so a few thousand issues cost under a hundred requests. Matching happens locally.
 */
const fetchFailedTestIssues = async (
  { github, repo }: IssueRepository,
  closedSince: Date,
  log: ToolingLog
): Promise<{ issues: GithubIssue[] } & IssueCounts> => {
  const requestsBefore = github.getRequestCount();
  const open = await github.listIssues({ state: 'open', labels: [FAILED_TEST_LABEL] });
  log.info(`Fetched ${open.length} open ${FAILED_TEST_LABEL} issues in ${repo}`);

  // Ascending by update time so issues updated while paging land on later pages, not earlier ones
  const closed = await github.listIssues({
    state: 'closed',
    labels: [FAILED_TEST_LABEL],
    since: closedSince,
    sort: 'updated',
    direction: 'asc',
  });
  log.info(
    `Fetched ${closed.length} ${FAILED_TEST_LABEL} issues in ${repo} closed and updated since ` +
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
 * Files a GitHub `failed-test` issue for every flaky suite of a report that no issue tracks yet,
 * worst suites first and at most `maxNewIssues` per run. A suite is tracked when every one of
 * its tests has an issue, in `githubRepo` or in the tracking repository, open or closed: an issue
 * about the suite or its file covers them all, a per-test issue only its own test. Issues about
 * some of the tests, or merely mentioning the file, are linked from the new issue instead. With
 * `updateIssues`, a suite tracked by its own issue in `githubRepo` has that issue refreshed. A
 * failed write is recorded and the run goes on with the next suite.
 */
export const reportFlakySuiteIssues = async (
  options: ReportFlakySuiteIssuesOptions
): Promise<FlakySuiteIssuesSummary> => {
  const { report, github, log, githubRepo, closedSince, maxNewIssues, updateIssues, dryRun } =
    options;
  const suites = groupIntoSuites(report.flaky, report.files);
  log.info(
    `${report.flaky.length} flaky tests in ${suites.length} suites${dryRun ? ' (dry run)' : ''}`
  );

  const target = { github, repo: githubRepo };
  const { issues, open, closed } = await fetchFailedTestIssues(target, closedSince, log);
  const index = indexIssues(issues.map(describeIssue));

  let tracking: FlakySuiteIssuesSummary['issues']['tracking'];
  let trackedUpstream = (_suite: FlakySuite): MatchedIssue | undefined => undefined;
  if (options.tracking) {
    const upstream = options.tracking;
    const fetched = await fetchFailedTestIssues(upstream, closedSince, log);
    const upstreamIndex = indexIssues(fetched.issues.map(describeIssue));
    tracking = { repo: upstream.repo, open: fetched.open, closed: fetched.closed };
    trackedUpstream = (suite) => coveringIssue(suite, upstreamIndex);
  }

  const actions: FlakySuiteAction[] = [];
  const counts: FlakySuiteIssuesSummary['counts'] = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const record = (action: FlakySuiteAction) => {
    actions.push(action);
    counts[action.action] += 1;
  };

  const create = async (suite: FlakySuite, related: MatchedIssue[]) => {
    const ref = suiteRef(suite);
    if (counts.created >= maxNewIssues) {
      log.info(`skip, ${maxNewIssues} issues already created this run: ${describeSuite(suite)}`);
      record({ action: 'skipped', ...ref, reason: 'max-new-issues' });
      return;
    }
    const title = flakySuiteIssueTitle(suite);
    const body = renderFlakySuiteIssueBody(suite, {
      report,
      relatedIssues: related.map(({ issue }) => issue.number),
    });
    try {
      const created = await github.createIssue(title, body, issueLabels(suite, githubRepo));
      log.info(`created #${created.number} ${created.html_url}: ${describeSuite(suite)}`);
      // Later suites of this run match against it too, an untitled suite's issue covers its file
      addIssueToIndex(index, describeIssue({ ...created, title, body, labels: [], state: 'open' }));
      record({
        action: 'created',
        ...ref,
        issue: { number: created.number, url: created.html_url, title, state: 'open' },
      });
    } catch (error) {
      log.error(`failed to create an issue for ${describeSuite(suite)}: ${errorMessage(error)}`);
      record({ action: 'failed', ...ref, attempted: 'create', error: errorMessage(error) });
    }
  };

  /** Body first: the Slack notification the comment triggers reads the updated metadata. */
  const update = async (
    suite: FlakySuite,
    issue: GithubIssue,
    related: MatchedIssue[],
    { previous, comment, reopen }: Refresh
  ) => {
    const ref = suiteRef(suite);
    const body = renderFlakySuiteIssueBody(suite, {
      report,
      relatedIssues: related
        .filter((matched) => matched.issue.number !== issue.number)
        .map((matched) => matched.issue.number),
      previous,
    });
    try {
      await github.editIssue(issue.number, { body, ...(reopen ? { state: 'open' } : {}) });
      if (comment) {
        await github.addIssueComment(
          issue.number,
          renderFlakySuiteIssueComment({ reopened: reopen })
        );
      }
      log.info(
        `${reopen ? 'reopened' : 'updated'} #${issue.number}${comment ? ' with a comment' : ''}: ` +
          describeSuite(suite)
      );
      record({
        action: 'updated',
        ...ref,
        issue: { ...issueRef(issue), state: 'open' },
        commented: comment,
        reopened: reopen,
      });
    } catch (error) {
      log.error(
        `failed to update #${issue.number} for ${describeSuite(suite)}: ${errorMessage(error)}`
      );
      record({
        action: 'failed',
        ...ref,
        attempted: 'update',
        error: errorMessage(error),
        issue: issueRef(issue),
      });
    }
  };

  for (const suite of suites) {
    const ref = suiteRef(suite);
    const matches = findMatchingIssues(suite, candidateIssues(suite, index));
    const tracked = coveringIssue(suite, index);
    const refresh =
      updateIssues && tracked && isOwnSuiteIssue(tracked, suite)
        ? planRefresh(suite, tracked.issue, report)
        : undefined;
    if (tracked && refresh) {
      await update(suite, tracked.issue, matches, refresh);
      continue;
    }
    if (tracked) {
      const { issue, match } = tracked;
      log.info(
        `skip, #${issue.number} (${match}, ${issue.state}) is about it: ${describeSuite(suite)}`
      );
      record({ action: 'skipped', ...ref, reason: 'tracked', issue: issueRef(issue), match });
      continue;
    }
    const upstream = trackedUpstream(suite);
    if (upstream && tracking) {
      const { issue, match } = upstream;
      log.info(
        `skip, ${tracking.repo}#${issue.number} (${match}, ${issue.state}) covers every test: ` +
          describeSuite(suite)
      );
      record({
        action: 'skipped',
        ...ref,
        reason: 'tracked-upstream',
        issue: issueRef(issue, tracking.repo),
        match,
      });
      continue;
    }
    // Issues that merely mention the file are not about the suite; they are linked, not updated
    await create(suite, matches);
  }

  return {
    generatedAt: report.generatedAt,
    dryRun,
    githubRepo,
    suites: suites.length,
    issues: { open, closed, closedSince, ...(tracking ? { tracking } : {}) },
    counts,
    actions,
  };
};
