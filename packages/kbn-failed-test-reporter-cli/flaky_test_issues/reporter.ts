/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTeamByGithubHandle } from '@kbn/code-owners';
import { rankTests, type FlakyTestReport } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DEFAULT_GITHUB_REPO,
  type GithubApi,
  type GithubIssue,
  type GithubIssueState,
} from '../failed_tests_reporter/github_api';
import {
  flakySuiteIssueTitle,
  lastPostedAt,
  readFlakySuiteIssueMetadata,
  refreshFlakySuiteIssueMetadata,
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
import {
  distinctIssues,
  closeReplacedIssues,
  isOpenPerTestIssue,
  replacedIssuesByTest,
  listReplacedIssues,
  withPreviouslyTracked,
} from './replace_per_test_issues';
import { isPullRequestRef } from './markdown';
import { isSkippedTest, skippedBranches } from './skipped';
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
  /** Leave out flaky tests that were skipped since (`isSkippedTest`). */
  omitSkippedTests: boolean;
  /**
   * Refresh the suite issues of `githubRepo` that the report finds flaky again: the body's
   * metadata is brought up to this report, a comment with its numbers posted when the suite
   * failed since the issue was filed or last commented on, and an issue closed before such a
   * failure reopened. The body's text stays as filed. Off, they are skipped as tracked.
   */
  updateIssues: boolean;
  /**
   * Days to wait after the newest report posted on an issue (the one that filed it, or the latest
   * comment) before it can get another comment. Failures in between are covered by the next one.
   */
  commentCooldownDays: number;
  /**
   * Hand the open per-test issues of `githubRepo` over to suite issues, once CI no longer updates
   * them: they stop counting as tracking their test, and those about a suite's flaky tests are
   * closed as duplicates of the suite's issue once it is filed or refreshed. Issues labelled
   * `skipped-test` are left open.
   */
  replacePerTestIssues: boolean;
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
   * Every test of the suite has an issue in `githubRepo`: a per-test issue about it (an open one
   * only when not replacing them), or an issue about the suite or its file, open or closed
   * after the test last failed. A single test without one gets the suite its issue. A suite issue
   * of its own is refreshed instead, unless it already has this report, or is closed and the suite
   * has not failed since.
   */
  | 'tracked'
  /** Same, for the tracking repository. */
  | 'tracked-upstream'
  /** Every flaky test of the suite was skipped since. */
  | 'all-tests-skipped';

/** The suite an action is about; several suites of one file are told apart by their title. */
export interface SuiteRef {
  filePath: string;
  suiteTitle?: string;
}

export type FlakySuiteAction = SuiteRef &
  (
    | {
        action: 'created';
        issue: IssueRef;
        /** Closed issues about its tests that no longer counted (`isSuperseded`). */
        supersedes?: IssueRef[];
        /** Per-test issues about its tests closed as its duplicates (`replacePerTestIssues`). */
        replaced?: IssueRef[];
      }
    /** The suite's own issue recorded this report; `commented` with its numbers on new failures. */
    | {
        action: 'updated';
        issue: IssueRef;
        commented: boolean;
        reopened: boolean;
        replaced?: IssueRef[];
      }
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
  /** Flaky tests left out as skipped. */
  omittedTests: number;
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

const sameSuite = (a: FlakySuite, b: FlakySuite): boolean =>
  a.framework === b.framework && a.filePath === b.filePath && a.suiteTitle === b.suiteTitle;

/** An issue this reporter filed for the suite itself, rather than for its whole file. */
const isOwnSuiteIssue = ({ issue, match }: MatchedIssue, suite: FlakySuite): boolean =>
  match === 'suite' &&
  readFlakySuiteIssueMetadata(issue.body)?.['suite.title'] === suite.suiteTitle;

/** An issue about a whole test file rather than one `describe` block of it. */
const isWholeFileIssue = ({ body }: GithubIssue): boolean =>
  readFlakySuiteIssueMetadata(body)?.['suite.title'] === undefined;

/**
 * The issue the report refreshes for the suite: its own issue, open or closed, else an open issue
 * about its whole file, such as a consistently failing issue for tests in several blocks of the
 * file, which CI failures of the suite's tests are already counted on. A closed one is not
 * reopened for a block of the file: the block gets an issue of its own.
 */
const refreshedIssue = (
  suite: FlakySuite,
  matches: readonly MatchedIssue[]
): MatchedIssue | undefined =>
  matches.find((matched) => isOwnSuiteIssue(matched, suite)) ??
  matches.find(
    ({ issue, match }) => match === 'suite' && issue.state === 'open' && isWholeFileIssue(issue)
  );

/**
 * The suites of a file that share its whole-file issue, as the one suite the issue is about: their
 * tests named after their `describe` block and ranked together, and no suite title, so the issue
 * stays about the whole file.
 */
const asWholeFileSuite = (members: readonly FlakySuite[]): FlakySuite => ({
  ...members[0],
  suiteTitle: undefined,
  owners: [...new Set(members.flatMap(({ owners }) => owners))],
  tests: rankTests(
    members.flatMap(({ suiteTitle, tests }) =>
      suiteTitle ? tests.map((test) => ({ ...test, title: `${suiteTitle} ${test.title}` })) : tests
    )
  ),
});

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

/**
 * A closed issue about a test that failed after it was closed no longer tracks it: the legacy
 * per-test issues get no further comments once `report_failed_tests` stops writing, the stale
 * sweep closes them, and they would otherwise keep the suite silent for `--closed-since-days`.
 * The suite's own issue is the exception, it is reopened instead (`planRefresh`). An issue
 * without `closed_at` keeps counting.
 */
const isSuperseded = (matched: MatchedIssue, test: FlakySuite): boolean => {
  const { issue } = matched;
  if (issue.state !== 'closed' || !issue.closed_at || isOwnSuiteIssue(matched, test)) {
    return false;
  }
  const failedAt = lastFailedAt(test);
  return failedAt !== undefined && failedAt > new Date(issue.closed_at);
};

interface Coverage {
  /**
   * The issue standing in for the suite when every one of its tests has one in the index: an
   * issue about the suite or its file covers them all, a per-test issue only its own test, unless
   * it is replaced. Undefined as soon as a test has none, that test deserves the suite issue.
   */
  tracked?: MatchedIssue;
  /** Issues about one of the tests that no longer count (`isSuperseded`), strongest first. */
  superseded: MatchedIssue[];
  /** The numbers of `superseded`, by the id of the test each is about. */
  supersededByTest: Map<string, number[]>;
}

const coverage = (suite: FlakySuite, index: IssueIndex, replacing: boolean): Coverage => {
  const covering: MatchedIssue[] = [];
  const superseded = new Map<number, MatchedIssue>();
  const supersededByTest = new Map<string, number[]>();
  let uncovered = false;
  for (const test of suite.tests) {
    const single = { ...suite, tests: [test] };
    const counting = findMatchingIssues(single, candidateIssues(single, index)).filter(
      (matched) => {
        if (replacing && isOpenPerTestIssue(matched)) {
          return false;
        }
        if (!isTracking(matched) || !isSuperseded(matched, single)) {
          return true;
        }
        superseded.set(matched.issue.number, matched);
        supersededByTest.set(test.testId, [
          ...(supersededByTest.get(test.testId) ?? []),
          matched.issue.number,
        ]);
        return false;
      }
    );
    const covered = strongestTracking(counting);
    if (covered) {
      covering.push(covered);
    } else {
      uncovered = true;
    }
  }
  const distinct = [...new Map(covering.map((match) => [match.issue.number, match])).values()];
  return {
    ...(uncovered ? {} : { tracked: strongestTracking(distinct.sort(compareMatches)) }),
    superseded: [...superseded.values()].sort(compareMatches),
    supersededByTest,
  };
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Calendar days between two times, so a report a few minutes earlier in the day still counts. */
const daysBetween = (from: Date, to: Date): number =>
  Math.round(
    (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) /
      MS_PER_DAY
  );

interface Refresh {
  previous: RecordedFlakySuiteIssueMetadata;
  /**
   * The issue is reopened, or the suite failed since the newest report posted on the issue, the
   * body as filed or the latest comment, and that was at least `commentCooldownDays` ago.
   */
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
  report: FlakyTestReport,
  commentCooldownDays: number
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
  const postedAt = lastPostedAt(previous);
  const failedSincePosted = failedAt !== undefined && (!postedAt || failedAt > new Date(postedAt));
  const due =
    !postedAt || daysBetween(new Date(postedAt), report.generatedAt) >= commentCooldownDays;
  return { previous, comment: failedSincePosted && due, reopen: false };
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
export const issueLabels = (suite: Pick<FlakySuite, 'owners'>, githubRepo: string): string[] => {
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
 * its tests has an issue, in `githubRepo` or in the tracking repository, open or closed after the
 * test last failed: an issue about the suite or its file covers them all, a per-test issue only
 * its own test. Issues about some of the tests, or merely mentioning the file, are linked from
 * the new issue instead, and so are the closed ones it replaces. With `updateIssues`, a
 * suite tracked by its own issue in `githubRepo` has that issue refreshed. With
 * `replacePerTestIssues`, the open per-test issues of `githubRepo` don't count, and are closed as
 * duplicates of the suite's issue once it is filed or refreshed. A failed write is recorded and
 * the run goes on with the next suite.
 */
export const reportFlakySuiteIssues = async (
  options: ReportFlakySuiteIssuesOptions
): Promise<FlakySuiteIssuesSummary> => {
  const {
    report,
    github,
    log,
    githubRepo,
    closedSince,
    maxNewIssues,
    omitSkippedTests,
    updateIssues,
    commentCooldownDays,
    replacePerTestIssues,
    dryRun,
  } = options;
  const omitted = omitSkippedTests ? report.flaky.filter(isSkippedTest) : [];
  const suites = groupIntoSuites(
    report.flaky.filter((test) => !omitted.includes(test)),
    report.files
  );
  // Suites with no test left
  const skippedSuites = groupIntoSuites(omitted, report.files).filter(
    (skipped) => !suites.some((suite) => sameSuite(suite, skipped))
  );
  log.info(
    `${report.flaky.length} flaky tests in ${suites.length + skippedSuites.length} suites` +
      (omitted.length > 0 ? `, ${omitted.length} of them skipped since and left out` : '') +
      (dryRun ? ' (dry run)' : '')
  );
  for (const test of omitted) {
    log.info(
      `omit, skipped since on ${skippedBranches(test).join(', ')}: ${test.filePath}` +
        `${test.suiteTitle ? ` (${test.suiteTitle})` : ''} › ${test.title}`
    );
  }

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
    // never written to, so its per-test issues can't be replaced and keep counting
    trackedUpstream = (suite) => coverage(suite, upstreamIndex, false).tracked;
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

  for (const suite of skippedSuites) {
    log.info(`skip, every flaky test was skipped since: ${describeSuite(suite)}`);
    record({ action: 'skipped', ...suiteRef(suite), reason: 'all-tests-skipped' });
  }

  /** The open per-test issues the suite's issue replaces, by test, when replacing them. */
  const perTestIssuesOf = (suite: FlakySuite): Map<string, GithubIssue[]> =>
    replacePerTestIssues ? replacedIssuesByTest(suite, index) : new Map();

  const issuesOf = (byTest: Map<string, GithubIssue[]>): GithubIssue[] =>
    distinctIssues([...byTest.values()].flat());

  /** Closes the issues as duplicates of the suite's issue; those closed, for its action. */
  const closeReplaced = async (
    suiteIssue: { number: number; id: number },
    perTest: readonly GithubIssue[]
  ): Promise<{ replaced?: IssueRef[] }> => {
    const replaced = await closeReplacedIssues({
      github,
      log,
      dryRun,
      issues: perTest,
      suiteIssue,
    });
    return replaced.length > 0 ? { replaced: replaced.map((issue) => issueRef(issue)) } : {};
  };

  /**
   * The superseded and replaced issues are named next to their test as previously tracking the
   * suite, the other matches linked as possibly related.
   */
  const create = async (
    suite: FlakySuite,
    related: MatchedIssue[],
    { superseded, supersededByTest }: Pick<Coverage, 'superseded' | 'supersededByTest'>
  ) => {
    const ref = suiteRef(suite);
    if (counts.created >= maxNewIssues) {
      log.info(`skip, ${maxNewIssues} issues already created this run: ${describeSuite(suite)}`);
      record({ action: 'skipped', ...ref, reason: 'max-new-issues' });
      return;
    }
    const title = flakySuiteIssueTitle(suite);
    const perTest = perTestIssuesOf(suite);
    const replacing = issuesOf(perTest);
    const previousIssues = new Map<string, number[]>();
    for (const { testId } of suite.tests) {
      const numbers = new Set([
        ...(supersededByTest.get(testId) ?? []),
        ...(perTest.get(testId) ?? []).map(({ number }) => number),
      ]);
      if (numbers.size > 0) {
        previousIssues.set(testId, [...numbers]);
      }
    }
    const previousNumbers = [...new Set([...previousIssues.values()].flat())];
    const body = renderFlakySuiteIssueBody(suite, {
      report,
      relatedIssues: related
        .map(({ issue }) => issue.number)
        .filter((number) => !previousNumbers.includes(number)),
      previousIssues,
    });
    try {
      const created = await github.createIssue(title, body, issueLabels(suite, githubRepo));
      log.info(
        `created #${created.number} ${created.html_url}: ${describeSuite(suite)}` +
          (previousNumbers.length > 0
            ? ` (previously tracked in ${previousNumbers.map((n) => `#${n}`).join(', ')})`
            : '')
      );
      // Later suites of this run match against it too, an untitled suite's issue covers its file
      addIssueToIndex(index, describeIssue({ ...created, title, body, labels: [], state: 'open' }));
      record({
        action: 'created',
        ...ref,
        issue: { number: created.number, url: created.html_url, title, state: 'open' },
        ...(superseded.length > 0
          ? { supersedes: superseded.map(({ issue }) => issueRef(issue)) }
          : {}),
        ...(await closeReplaced(created, replacing)),
      });
    } catch (error) {
      log.error(`failed to create an issue for ${describeSuite(suite)}: ${errorMessage(error)}`);
      record({ action: 'failed', ...ref, attempted: 'create', error: errorMessage(error) });
    }
  };

  /**
   * Metadata first. The body's text stays as filed, this report's numbers go in the
   * comment. A comment that then fails is not retried: the metadata already records it, so the
   * next qualifying report comments instead. Recording it after the comment would take another
   * edit, and a failure there would mean a duplicate comment rather than a missed one. The
   * per-test issues of the suites refreshed join the body's "Previously tracked in" line, the
   * comment names them, or the next one does, and they are closed last, in favor of the issue as now
   * open.
   */
  const update = async (
    suite: FlakySuite,
    issue: GithubIssue,
    { previous, comment, reopen }: Refresh,
    members: readonly FlakySuite[] = [suite]
  ) => {
    const recordEach = (action: (ref: SuiteRef) => FlakySuiteAction) =>
      members.forEach((member) => record(action(suiteRef(member))));
    const replacing = members.map((member) => issuesOf(perTestIssuesOf(member)));
    const { body, announced } = listReplacedIssues(
      refreshFlakySuiteIssueMetadata(issue.body, suite, { report, previous, comment }),
      distinctIssues(replacing.flat()).map(({ number }) => number),
      comment
    );
    try {
      await github.editIssue(issue.number, { body, ...(reopen ? { state: 'open' } : {}) });
      if (comment) {
        await github.addIssueComment(
          issue.number,
          withPreviouslyTracked(
            renderFlakySuiteIssueComment(suite, { report, reopened: reopen, previous }),
            announced
          )
        );
      }
      log.info(
        `${reopen ? 'reopened' : 'updated'} #${issue.number}${comment ? ' with a comment' : ''}: ` +
          describeSuite(suite)
      );
      for (const [position, member] of members.entries()) {
        record({
          action: 'updated',
          ...suiteRef(member),
          issue: { ...issueRef(issue), state: 'open' },
          commented: comment,
          reopened: reopen,
          ...(await closeReplaced(issue, replacing[position])),
        });
      }
    } catch (error) {
      log.error(
        `failed to update #${issue.number} for ${describeSuite(suite)}: ${errorMessage(error)}`
      );
      recordEach((ref) => ({
        action: 'failed',
        ...ref,
        attempted: 'update',
        error: errorMessage(error),
        issue: issueRef(issue),
      }));
    }
  };

  /** The suites of `suite`'s file whose own issue is `issue`, `suite` included, in ranking order. */
  const suitesSharing = (suite: FlakySuite, issue: GithubIssue): FlakySuite[] =>
    suites.filter(
      (other) =>
        other.framework === suite.framework &&
        other.filePath === suite.filePath &&
        refreshedIssue(other, findMatchingIssues(other, candidateIssues(other, index)))?.issue
          .number === issue.number
    );

  /** Suites refreshed with an earlier suite of their file, on the file's whole-file issue. */
  const refreshedTogether = new Set<FlakySuite>();

  for (const suite of suites) {
    if (refreshedTogether.has(suite)) {
      continue;
    }
    const ref = suiteRef(suite);
    const matches = findMatchingIssues(suite, candidateIssues(suite, index));
    const { tracked, ...supersededIssues } = coverage(suite, index, replacePerTestIssues);
    const own = updateIssues ? refreshedIssue(suite, matches) : undefined;
    if (own) {
      const members = isWholeFileIssue(own.issue) ? suitesSharing(suite, own.issue) : [suite];
      const ownSuite = isWholeFileIssue(own.issue) ? asWholeFileSuite(members) : suite;
      const refresh = planRefresh(ownSuite, own.issue, report, commentCooldownDays);
      if (refresh) {
        members.forEach((member) => refreshedTogether.add(member));
        await update(ownSuite, own.issue, refresh, members);
        continue;
      }
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
    await create(suite, matches, supersededIssues);
  }

  return {
    generatedAt: report.generatedAt,
    dryRun,
    githubRepo,
    suites: suites.length + skippedSuites.length,
    omittedTests: omitted.length,
    issues: { open, closed, closedSince, ...(tracking ? { tracking } : {}) },
    counts,
    actions,
  };
};
