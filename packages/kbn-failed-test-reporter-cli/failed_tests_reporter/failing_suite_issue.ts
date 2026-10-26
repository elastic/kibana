/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { BuildRun, TestFramework } from '@kbn/scout-reporting';
import {
  FLAKY_TEST_SUITE_METADATA_PREFIX,
  SKIP_TIP,
  suiteIssueTitle,
  type FlakySuiteIssueMetadata,
} from '../flaky_test_issues/issue_body';
import {
  CATEGORY_LABELS,
  codeBlock,
  formatFullFailureMessage,
  FRAMEWORK_LABELS,
  inlineCode,
  KIBANA_BLOB_URL,
  plural,
  table,
  targetEnvironment,
  testDashboardUrl,
} from '../flaky_test_issues/markdown';
import { updateIssueMetadata } from './issue_metadata';

const KIBANA_COMPARE_URL = 'https://github.com/elastic/kibana/compare';

/** A test of a failing suite: what the issue lists it as and matches it on. */
export interface FailingTest {
  testId: string;
  /** The describe blocks and the title, as the framework names the test. */
  title: string;
  /** What the test failed with in the job that found the break. */
  errorMessage?: string;
}

/** A Scout target the suite failed on, as the test events record it. */
export interface FailingTarget {
  mode: string;
  type: string;
}

/**
 * A test file whose tests failed every attempt of the latest builds of one pipeline and branch
 * after passing before: a break rather than flakiness.
 */
export interface FailingSuite {
  filePath: string;
  framework: TestFramework;
  /**
   * Title of the describe block every failing test is in; absent when they span several or the
   * framework reports none, the issue is then about the whole file.
   */
  suiteTitle?: string;
  configPath?: string;
  /** What the config runs (`ui-test`, `api-test`, ...), when the events record it. */
  configCategory?: string;
  targets: FailingTarget[];
  owners: string[];
  tests: FailingTest[];
  /** The builds of the streak, oldest first. */
  failingBuilds: BuildRun[];
  /** The last build in which the tests passed, when it is on record. */
  lastPassingBuild?: BuildRun;
}

export interface FailingSuiteIssueContext {
  pipeline: string;
  branch: string;
  /** Numbers of issues that mention the suite's file or are about some of its tests. */
  relatedIssues?: number[];
}

/** The suite metadata a failing suite issue records, the fields a break knows. */
export type FailingSuiteIssueMetadata = Pick<
  FlakySuiteIssueMetadata,
  | 'suite.filePath'
  | 'suite.title'
  | 'suite.framework'
  | 'suite.testIds'
  | 'suite.branches'
  | 'suite.pipelines'
>;

/** `Failing Scout UI suite: Discover ES|QL mode`, or the file name without a suite title. */
export const failingSuiteIssueTitle = (suite: FailingSuite): string =>
  suiteIssueTitle('Failing', suite);

/**
 * The same `flaky-test-suite` metadata as a flaky suite issue carries, so ci-stats, the failed
 * test reporter and `/skip` treat the issue as tracking the suite's tests on this branch.
 */
export const failingSuiteIssueMetadata = (
  suite: FailingSuite,
  { pipeline, branch }: FailingSuiteIssueContext
): FailingSuiteIssueMetadata => ({
  'suite.filePath': suite.filePath,
  ...(suite.suiteTitle ? { 'suite.title': suite.suiteTitle } : {}),
  'suite.framework': suite.framework,
  'suite.testIds': suite.tests.map((test) => test.testId),
  'suite.branches': [branch],
  'suite.pipelines': [pipeline],
});

const blobLink = (repoRelativePath: string): string =>
  `[${inlineCode(repoRelativePath)}](${KIBANA_BLOB_URL}/${repoRelativePath})`;

const buildLink = ({ build, buildUrl }: BuildRun): string =>
  buildUrl ? `[#${build}](${buildUrl})` : `#${build}`;

/**
 * `` `kibana-on-merge` builds [#123](…) and [#124](…) on `main` ``, or, for a longer streak,
 * `` the last 4 `kibana-on-merge` builds on `main`, [#121](…) to [#124](…) ``.
 */
const describeBuilds = (
  builds: readonly BuildRun[],
  { pipeline, branch }: FailingSuiteIssueContext
): string => {
  const first = buildLink(builds[0]);
  const last = buildLink(builds[builds.length - 1]);
  return builds.length > 2
    ? `the last ${builds.length} ${inlineCode(pipeline)} builds on ${inlineCode(branch)}, ` +
        `${first} to ${last}`
    : `${inlineCode(pipeline)} builds ${first} and ${last} on ${inlineCode(branch)}`;
};

/** `[abc1234...def5678](…/compare/abc1234…...def5678…)`, when both commits are known. */
const compareLink = (from: BuildRun, to: BuildRun): string | undefined =>
  from.commit && to.commit
    ? `[${inlineCode(`${from.commit.slice(0, 7)}...${to.commit.slice(0, 7)}`)}]` +
      `(${KIBANA_COMPARE_URL}/${from.commit}...${to.commit})`
    : undefined;

/**
 * What happened, in one callout: how many tests, where, in which builds, since when, and the
 * commits between the last pass and the first failure when both are known.
 */
const opening = (suite: FailingSuite, ctx: FailingSuiteIssueContext): string => {
  const { failingBuilds, lastPassingBuild } = suite;
  const file = `[${inlineCode(Path.basename(suite.filePath))}](${KIBANA_BLOB_URL}/${
    suite.filePath
  })`;
  const where = describeBuilds(failingBuilds, ctx);
  const before = lastPassingBuild
    ? `after passing in ${buildLink(lastPassingBuild)}`
    : `with no earlier passing run on ${inlineCode(ctx.branch)} on record`;
  const compare = lastPassingBuild ? compareLink(lastPassingBuild, failingBuilds[0]) : undefined;
  const cause = compare
    ? `; the changes between the last passing and the first failing build are ${compare}.`
    : '.';
  return (
    '> [!IMPORTANT]\n' +
    `> ${plural(suite.tests.length, 'test')} in ${file} failed every attempt of ${where}, ` +
    `${before}. This looks like a break rather than a flaky test${cause}`
  );
};

const testsList = (suite: FailingSuite): string =>
  [
    'Tests that failed every attempt:',
    ...suite.tests.map(
      (test) => `- ${inlineCode(test.title)} · [history](${testDashboardUrl(test.testId)})`
    ),
  ].join('\n');

const suiteDetails = (suite: FailingSuite): string => {
  const category = suite.configCategory ? CATEGORY_LABELS[suite.configCategory] : undefined;
  const targets = suite.targets.map(
    (target) => `${inlineCode(target.mode)} · ${targetEnvironment(target)}`
  );
  const rows: string[][] = [
    ['**Framework**', FRAMEWORK_LABELS[suite.framework].long],
    ...(category ? [['**Category**', `${category} test`]] : []),
    ['**File**', blobLink(suite.filePath)],
    ...(suite.configPath ? [['**Config**', blobLink(suite.configPath)]] : []),
    ...(targets.length > 0
      ? [[`**${targets.length > 1 ? 'Targets' : 'Target'}**`, targets.join(', ')]]
      : []),
    ['**Owners**', suite.owners.length > 0 ? suite.owners.map(inlineCode).join(', ') : '-'],
  ];
  return table(['Field', 'Value'], rows);
};

/** The error of the first test that has one, from the job that found the break. */
const lastFailure = (suite: FailingSuite): string | undefined => {
  const test = suite.tests.find(({ errorMessage }) => errorMessage?.trim());
  if (!test?.errorMessage) {
    return undefined;
  }
  const lead =
    suite.tests.length > 1 ? `Last failure of ${inlineCode(test.title)}:` : 'Last failure:';
  return `${lead}\n\n${codeBlock(formatFullFailureMessage(test.errorMessage))}`;
};

const relatedIssues = ({ relatedIssues: numbers }: FailingSuiteIssueContext): string | undefined =>
  numbers && numbers.length > 0
    ? `Possibly related: ${numbers.map((number) => `#${number}`).join(', ')}.`
    : undefined;

/** Full issue body for a new failing suite issue, including the hidden metadata. */
export const renderFailingSuiteIssueBody = (
  suite: FailingSuite,
  ctx: FailingSuiteIssueContext
): string =>
  updateIssueMetadata(
    [
      opening(suite, ctx),
      testsList(suite),
      suiteDetails(suite),
      lastFailure(suite),
      relatedIssues(ctx),
      SKIP_TIP,
    ]
      .filter((section) => section !== undefined)
      .join('\n\n'),
    failingSuiteIssueMetadata(suite, ctx),
    FLAKY_TEST_SUITE_METADATA_PREFIX
  );
