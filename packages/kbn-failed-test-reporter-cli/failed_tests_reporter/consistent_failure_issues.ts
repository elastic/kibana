/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client as ESClient } from '@elastic/elasticsearch';
import {
  fetchRecentRuns,
  findConsistentFailure,
  verdictOf,
  type ConsistentFailure,
  type TestFramework,
  type TestSetup,
} from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import { FLAKY_TEST_SUITE_METADATA_PREFIX } from '../flaky_test_issues/issue_body';
import { plural } from '../flaky_test_issues/markdown';
import {
  candidateIssues,
  describeIssue,
  findMatchingIssues,
  indexIssues,
  type IssueIndex,
  type MatchedIssue,
} from '../flaky_test_issues/match_issues';
import { FAILED_TEST_LABEL, issueLabels } from '../flaky_test_issues/reporter';
import { getScoutTestId, getTestFilePath, isScoutFailure } from './failure_identity';
import {
  failingPostedAt,
  failingSuiteIssueTitle,
  postedAtKey,
  renderFailingSuiteComment,
  renderFailingSuiteIssueBody,
  type FailingSuite,
  type FailingTarget,
  type FailingTest,
} from './failing_suite_issue';
import type { TestFailure } from './get_failures';
import type { GithubApi, GithubIssue } from './github_api';
import { updateIssueMetadata } from './issue_metadata';
import { extractErrorMessage, testLabel } from './report_failure';

/**
 * Days of the branch's builds the rule looks at: enough for the clean runs it asks for on a busy
 * branch, and a quiet one gets the shorter history the rule accepts.
 */
const HISTORY_DAYS = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Builds named in the log for a test that is not failing consistently. */
const LOGGED_BUILDS = 6;
/** More files breaking at once in one job is a systemic failure, not that many suite breaks. */
export const MAX_NEW_ISSUES_PER_JOB = 5;
/** A suite whose issue was closed in these last days gets it reopened rather than a new one. */
const CLOSED_ISSUES_DAYS = 30;
/** Time between two posts of a break on an issue, per pipeline and branch: a daily reminder. */
const POST_INTERVAL_MS = MS_PER_DAY;

/** What frameworks without a Scout target (Jest, FTR, Cypress) record as the target mode. */
const UNKNOWN_TARGET_MODE = 'unknown';

export interface CurrentBuild {
  pipeline: string;
  branch: string;
}

export interface ConsistentFailureIssuesOptions {
  log: ToolingLog;
  /** The job's failures, with irrelevant and cascading ones and duplicates left out. */
  failures: readonly TestFailure[];
  es: ESClient;
  /** Client of the repository the issues are filed in. */
  github: GithubApi;
  /** `owner/name` of that repository; team labels are only added in `elastic/kibana`. */
  repo: string;
  build: CurrentBuild;
  dryRun: boolean;
  now?: Date;
}

export interface SuiteIssueRef {
  filePath: string;
  url: string;
}

export interface ConsistentFailureIssuesSummary {
  /** Issues filed, or that would have been in a dry run. */
  created: SuiteIssueRef[];
  /** Issues already about the suite that were told about the break, reopened if closed. */
  commented: Array<SuiteIssueRef & { reopened: boolean }>;
  /**
   * Suites an issue is already about without a comment: per-test issues, which get their own
   * failure comments, or a suite issue the break was posted on less than a day ago.
   */
  tracked: SuiteIssueRef[];
  /** Files of the suites over the cap. */
  skipped: string[];
}

interface Candidate {
  failure: TestFailure;
  testId: string;
  framework: TestFramework;
  filePath: string;
}

/** A test that failed every attempt of the latest builds in one setup. */
interface Break extends ConsistentFailure {
  candidate: Candidate;
  setup: TestSetup;
  suiteTitle?: string;
}

const frameworkOf = (failure: TestFailure): TestFramework | undefined => {
  if (isScoutFailure(failure)) {
    return 'playwright';
  }
  return failure.testType === 'ftr' || failure.testType === 'jest' ? failure.testType : undefined;
};

/** The failures the test events can tell the history of: one per test id, with a file. */
const candidatesOf = (failures: readonly TestFailure[]): Candidate[] => {
  const byId = new Map<string, Candidate>();
  for (const failure of failures) {
    const testId = getScoutTestId(failure);
    const framework = frameworkOf(failure);
    const filePath = getTestFilePath(failure);
    if (testId && framework && filePath && !byId.has(testId)) {
      byId.set(testId, { failure, testId, framework, filePath });
    }
  }
  return [...byId.values()];
};

const setupLabel = ({ configPath, targetMode }: TestSetup): string =>
  [configPath, targetMode !== UNKNOWN_TARGET_MODE ? targetMode : undefined]
    .filter((part) => part !== undefined)
    .join(' on ') || 'unknown setup';

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const ownersOf = (failure: TestFailure): string[] =>
  (failure.owners ?? '')
    .split(',')
    .map((owner) => owner.trim())
    .filter(Boolean);

const errorMessageOf = (failure: TestFailure): string | undefined =>
  isScoutFailure(failure) ? failure.errorMessage : extractErrorMessage(failure.failure);

/**
 * One suite per file and framework, as a break takes a file or a block of it: the title is the
 * describe block when every broken test is in the same one, and the builds are those of the
 * test that broke first. Files with the most broken tests first.
 */
const groupIntoSuites = (breaks: readonly Break[]): FailingSuite[] => {
  const byFile = new Map<string, Break[]>();
  for (const item of breaks) {
    const key = `${item.candidate.framework}\n${item.candidate.filePath}`;
    byFile.set(key, [...(byFile.get(key) ?? []), item]);
  }
  return [...byFile.values()]
    .map((group): FailingSuite => {
      const lead = group.reduce((earliest, item) =>
        item.failingBuilds[0].build < earliest.failingBuilds[0].build ? item : earliest
      );
      const titles = unique(group.map((item) => item.suiteTitle));
      const tests = new Map<string, FailingTest>();
      for (const { candidate } of group) {
        tests.set(candidate.testId, {
          testId: candidate.testId,
          title: testLabel(candidate.failure),
          errorMessage: errorMessageOf(candidate.failure),
        });
      }
      const targets = new Map<string, FailingTarget>();
      for (const { setup } of group) {
        if (setup.targetMode && setup.targetMode !== UNKNOWN_TARGET_MODE && setup.targetType) {
          targets.set(setup.targetMode, { mode: setup.targetMode, type: setup.targetType });
        }
      }
      return {
        filePath: lead.candidate.filePath,
        framework: lead.candidate.framework,
        suiteTitle: titles.length === 1 ? titles[0] : undefined,
        configPath: lead.setup.configPath,
        configCategory: lead.setup.configCategory,
        targets: [...targets.values()],
        owners: unique(group.flatMap(({ candidate }) => ownersOf(candidate.failure))),
        tests: [...tests.values()].sort((a, b) => a.title.localeCompare(b.title)),
        failingBuilds: lead.failingBuilds,
        lastPassingBuild: lead.lastPassingBuild,
      };
    })
    .sort((a, b) => b.tests.length - a.tests.length || a.filePath.localeCompare(b.filePath));
};

/** A match that means the issue is about the test or the suite; `file` matches only mention it. */
const isAbout = ({ match }: MatchedIssue): boolean => match !== 'file';

const isOpen = ({ issue }: MatchedIssue): boolean => issue.state === 'open';

/**
 * The issue already tracking the suite: one about the suite or its whole file, an open one before
 * a recently closed one, or, failing that, the open per-test issue of one of its tests when every
 * test has one. A single test without an issue gets the suite its issue.
 */
const trackingIssue = (suite: FailingSuite, index: IssueIndex): MatchedIssue | undefined => {
  const matches = findMatchingIssues(suite, candidateIssues(suite, index));
  const aboutSuite = matches.find(({ match }) => match === 'suite');
  if (aboutSuite) {
    return aboutSuite;
  }
  const perTest = suite.tests.map((test) => {
    const single = { ...suite, tests: [test] };
    return findMatchingIssues(single, candidateIssues(single, index)).find(
      (matched) => isAbout(matched) && isOpen(matched)
    );
  });
  return perTest.every((issue) => issue !== undefined) ? perTest[0] : undefined;
};

/**
 * The open `failed-test` issues and those closed in the last `CLOSED_ISSUES_DAYS`, issues closed as
 * duplicates left out: they point at another issue instead of tracking the suite.
 */
const listFailedTestIssues = async (github: GithubApi, now: Date): Promise<GithubIssue[]> => {
  const open = await github.listIssues({ state: 'open', labels: [FAILED_TEST_LABEL] });
  const closed = await github.listIssues({
    state: 'closed',
    labels: [FAILED_TEST_LABEL],
    since: new Date(now.getTime() - CLOSED_ISSUES_DAYS * MS_PER_DAY),
  });
  // an issue closed between the two listings is in both; keep the later, closed, version
  const byNumber = new Map([...open, ...closed].map((issue) => [issue.number, issue]));
  return [...byNumber.values()].filter(({ state_reason: reason }) => reason !== 'duplicate');
};

const describeSuite = ({ filePath, framework }: FailingSuite): string =>
  `${filePath} (${framework})`;

/**
 * Files a `failed-test` issue for every test file of the job whose tests failed every attempt of
 * the latest builds of the pipeline and branch after passing before, by the test events of those
 * builds. A file an issue is already about gets none: a suite issue, open or recently closed,
 * gets a comment instead, at most once a day per pipeline and branch, and is reopened; per-test
 * issues get their own failure comments. Nor do files beyond `MAX_NEW_ISSUES_PER_JOB` get one, so
 * a job that breaks everything files a few issues, not dozens. The same break is found again by
 * the next builds while it lasts, so a check that could not run does not lose it, and the issue
 * it filed then keeps it from being filed twice.
 */
export const reportConsistentFailureIssues = async (
  options: ConsistentFailureIssuesOptions
): Promise<ConsistentFailureIssuesSummary> => {
  const { log, failures, es, github, repo, build, dryRun, now = new Date() } = options;
  const summary: ConsistentFailureIssuesSummary = {
    created: [],
    commented: [],
    tracked: [],
    skipped: [],
  };

  const candidates = candidatesOf(failures);
  if (candidates.length === 0) {
    log.info('No failures with a test id to check for a consistent failure');
    return summary;
  }
  log.info(
    `Checking ${candidates.length} failed tests for a consistent failure on ${build.pipeline} ` +
      `${build.branch}, over the last ${HISTORY_DAYS} days of builds`
  );
  const since = new Date(now.getTime() - HISTORY_DAYS * MS_PER_DAY);
  const runs = await fetchRecentRuns(
    es,
    { pipeline: build.pipeline, branch: build.branch, since },
    candidates
  );

  const byId = new Map(candidates.map((candidate) => [candidate.testId, candidate]));
  const breaks: Break[] = [];
  for (const { testId, suiteTitle, setup, runs: builds } of runs) {
    const candidate = byId.get(testId);
    if (!candidate) {
      continue;
    }
    const name = `${candidate.filePath} › ${testLabel(candidate.failure)} (${setupLabel(setup)})`;
    const found = findConsistentFailure(builds);
    if (found) {
      const { failingBuilds, lastPassingBuild } = found;
      log.info(
        `${name}: failed every attempt since #${failingBuilds[0].build}` +
          (lastPassingBuild ? `, last passed in #${lastPassingBuild.build}` : '')
      );
      breaks.push({ candidate, setup, suiteTitle, ...found });
      continue;
    }
    const recent = builds.slice(-LOGGED_BUILDS).map((run) => `#${run.build} ${verdictOf(run)}`);
    log.info(`${name}: not a consistent failure, latest builds: ${recent.join(', ')}`);
  }
  if (breaks.length === 0) {
    return summary;
  }

  const issues = await listFailedTestIssues(github, now);
  const index = indexIssues(issues.map(describeIssue));
  const key = postedAtKey(build);

  /**
   * Posts the break on the issue already about the suite, at most once per `POST_INTERVAL_MS` for
   * this pipeline and branch while it is open, and reopens it, with the post, if closed. The time
   * of the post goes in the issue's metadata first, read from GitHub as it is now: other jobs of
   * the build find the same break.
   */
  const postBreak = async (suite: FailingSuite, issue: GithubIssue) => {
    const ref = { filePath: suite.filePath, url: issue.html_url };
    const body = (await github.getIssue(issue.number))?.body ?? issue.body;
    const postedAt = failingPostedAt(body);
    const last = postedAt[key];
    const reopen = issue.state === 'closed';
    if (!reopen && last && now.getTime() - new Date(last).getTime() < POST_INTERVAL_MS) {
      log.info(
        `Skip, the break on ${key} was posted on #${issue.number} at ${last}: ${describeSuite(
          suite
        )}`
      );
      summary.tracked.push(ref);
      return;
    }
    const newBody = updateIssueMetadata(
      body,
      { 'failing.postedAt': { ...postedAt, [key]: now.toISOString() } },
      FLAKY_TEST_SUITE_METADATA_PREFIX
    );
    await github.editIssue(issue.number, { body: newBody, ...(reopen ? { state: 'open' } : {}) });
    await github.addIssueComment(issue.number, renderFailingSuiteComment(suite, build));
    log.info(
      `${dryRun ? 'Would post' : 'Posted'} the break on #${issue.number}` +
        `${reopen ? ', reopened' : ''}: ${describeSuite(suite)}`
    );
    summary.commented.push({ ...ref, reopened: reopen });
  };

  for (const suite of groupIntoSuites(breaks)) {
    const tracked = trackingIssue(suite, index);
    if (tracked?.match === 'suite') {
      await postBreak(suite, tracked.issue);
      continue;
    }
    if (tracked) {
      const { issue, match } = tracked;
      log.info(`Skip, #${issue.number} (${match}) is already about it: ${describeSuite(suite)}`);
      summary.tracked.push({ filePath: suite.filePath, url: issue.html_url });
      continue;
    }
    if (summary.created.length >= MAX_NEW_ISSUES_PER_JOB) {
      log.warning(
        `Skip, ${MAX_NEW_ISSUES_PER_JOB} issues already filed by this job, likely a systemic ` +
          `failure: ${describeSuite(suite)}`
      );
      summary.skipped.push(suite.filePath);
      continue;
    }
    const related = findMatchingIssues(suite, candidateIssues(suite, index))
      .filter(isOpen)
      .map(({ issue }) => issue.number);
    const title = failingSuiteIssueTitle(suite);
    const body = renderFailingSuiteIssueBody(suite, {
      ...build,
      relatedIssues: related,
      postedAt: now,
    });
    const created = await github.createIssue(title, body, issueLabels(suite, repo));
    log.info(
      `${dryRun ? 'Would create' : 'Created'} ${created.html_url} "${title}" for ` +
        `${plural(suite.tests.length, 'test')} in ${describeSuite(suite)}`
    );
    summary.created.push({ filePath: suite.filePath, url: created.html_url });
  }
  return summary;
};
