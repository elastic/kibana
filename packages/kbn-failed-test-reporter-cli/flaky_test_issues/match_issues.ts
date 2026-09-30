/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { TestFramework } from '@kbn/scout-reporting';
import { getLocationFromClassname } from '../failed_tests_reporter/get_failures';
import type { GithubIssue } from '../failed_tests_reporter/github_api';
import { getIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { readFlakySuiteIssueMetadata } from './issue_body';
import type { FlakySuite } from './suites';

/**
 * What a `failed-test` issue says about its test: a suite issue records the file in its
 * metadata, a per-test issue filed by `report_failed_tests` carries other metadata. Every field
 * is best effort: older issues lack some metadata, hand-written ones lack all of it.
 */
export interface IssueDetails {
  issue: GithubIssue;
  /** File a suite issue is about, from its `flaky-test-suite` metadata. */
  suiteFilePath?: string;
  /** Suite of that file the issue is about; absent for issues about a whole file. */
  suiteTitle?: string;
  /** Framework the suite issue is about; absent when the metadata does not record one. */
  suiteFramework?: string;
  /** Scout test id from the `Test ID` row; the same id `discover-flaky-tests` reports. */
  scoutTestId?: string;
  /** File the issue names: the Scout `Location` row or the `<path>·ts` ending an FTR classname. */
  filePath?: string;
  /** Directory named by a Jest classname (`Jest Tests.<dir>`); Jest issues do not name the file. */
  jestDirectory?: string;
  /** Full test name from the metadata, i.e. the describe blocks followed by the test title. */
  testName?: string;
  /**
   * Framework of a per-test issue, from the `test.type` the failed-test reporter records
   * (`scout` is Playwright); absent for hand-written issues and those filed before it was recorded.
   */
  testFramework?: TestFramework;
  /** Title and body with JUnit's `·` restored to `.`, so file paths can be looked up in it. */
  text: string;
}

export type IssueMatch =
  /** An issue about the whole suite, or about its whole file, by its `flaky-test-suite` metadata. */
  | 'suite'
  /** A per-test issue about one of the suite's flaky tests. */
  | 'test'
  /** Same test and file name, but the issue names an old location: the file was moved since. */
  | 'moved'
  /** The issue names the suite's file but a different test, or one that could not be matched. */
  | 'file';

export interface MatchedIssue {
  issue: GithubIssue;
  match: IssueMatch;
}

const MATCH_STRENGTH: Record<IssueMatch, number> = { suite: 0, test: 1, moved: 2, file: 3 };
const JEST_CLASS_PREFIX = 'Jest Tests.';
const SCOUT_TEST_ID_ROW = /^\|\s*Test ID\s*\|\s*(\S+)\s*\|/m;
const LOCATION_ROW = /^\|\s*Location\s*\|\s*(\S+)\s*\|/m;
const SOURCE_FILE = /\.(tsx?|jsx?)$/;

const undot = (value: string): string => value.replace(/·/g, '.');

const metadataString = (body: string, key: string): string | undefined => {
  const value: unknown = getIssueMetadata(body, key);
  return typeof value === 'string' ? value : undefined;
};

/** `test.type` as `report_failed_tests` records it, mapped to the report's framework names. */
const TEST_TYPE_FRAMEWORKS: Record<string, TestFramework> = {
  jest: 'jest',
  ftr: 'ftr',
  scout: 'playwright',
  cypress: 'cypress',
};

/** Extracts the matching keys of an issue once, so every suite can be checked cheaply. */
export const describeIssue = (issue: GithubIssue): IssueDetails => {
  const className = metadataString(issue.body, 'test.class') ?? '';
  // FTR classnames end in the file (`<report>.<path>·ts`), Jest ones in the directory
  const classLocation = getLocationFromClassname(className);
  const location = issue.body.match(LOCATION_ROW)?.[1];
  const suiteMetadata = readFlakySuiteIssueMetadata(issue.body);
  const testType = metadataString(issue.body, 'test.type');
  return {
    issue,
    suiteFilePath: suiteMetadata?.['suite.filePath'],
    suiteTitle: suiteMetadata?.['suite.title'],
    suiteFramework: suiteMetadata?.['suite.framework'],
    scoutTestId: issue.body.match(SCOUT_TEST_ID_ROW)?.[1],
    filePath: location
      ? undot(location)
      : SOURCE_FILE.test(classLocation)
      ? classLocation
      : undefined,
    jestDirectory: className.startsWith(JEST_CLASS_PREFIX) ? classLocation : undefined,
    testName: metadataString(issue.body, 'test.name'),
    testFramework: testType === undefined ? undefined : TEST_TYPE_FRAMEWORKS[testType],
    text: undot(`${issue.title}\n${issue.body}`),
  };
};

/** Source file names (`foo.spec.ts`, `bar.js`) anywhere in a text, after `·` was restored. */
const SOURCE_FILE_NAME = /[\w.-]+\.(?:tsx?|jsx?)\b/g;

/**
 * Issues keyed by everything `findMatchingIssues` can match on, so that a suite only has to be
 * checked against the few issues that could be about it rather than every issue fetched.
 */
export interface IssueIndex {
  /** File names mentioned anywhere in the title or body, e.g. `default_status_alert.spec.ts`. */
  byFileName: Map<string, IssueDetails[]>;
  /** Directory named by a Jest classname, for the issues that never name the file. */
  byJestDirectory: Map<string, IssueDetails[]>;
  byScoutTestId: Map<string, IssueDetails[]>;
}

const addTo = (index: Map<string, IssueDetails[]>, key: string, details: IssueDetails) => {
  const existing = index.get(key);
  if (existing) {
    existing.push(details);
  } else {
    index.set(key, [details]);
  }
};

/** Adds one issue to the index, e.g. one filed during the run, so later suites can match it. */
export const addIssueToIndex = (index: IssueIndex, details: IssueDetails): void => {
  const { text, filePath, suiteFilePath, jestDirectory, scoutTestId } = details;
  const fileNames = new Set(text.match(SOURCE_FILE_NAME) ?? []);
  for (const named of [filePath, suiteFilePath]) {
    if (named) {
      fileNames.add(Path.basename(named));
    }
  }
  for (const fileName of fileNames) {
    addTo(index.byFileName, fileName, details);
  }
  if (jestDirectory) {
    addTo(index.byJestDirectory, jestDirectory, details);
  }
  if (scoutTestId) {
    addTo(index.byScoutTestId, scoutTestId, details);
  }
};

export const indexIssues = (issues: readonly IssueDetails[]): IssueIndex => {
  const index: IssueIndex = {
    byFileName: new Map(),
    byJestDirectory: new Map(),
    byScoutTestId: new Map(),
  };
  for (const details of issues) {
    addIssueToIndex(index, details);
  }
  return index;
};

/** The issues that could match the suite: they name its file, its Jest directory or one of its tests. */
export const candidateIssues = (suite: FlakySuite, index: IssueIndex): IssueDetails[] => {
  const candidates = new Set<IssueDetails>([
    ...(index.byFileName.get(Path.basename(suite.filePath)) ?? []),
    ...(index.byJestDirectory.get(Path.dirname(suite.filePath)) ?? []),
  ]);
  for (const { testId } of suite.tests) {
    for (const details of index.byScoutTestId.get(testId) ?? []) {
      candidates.add(details);
    }
  }
  return [...candidates];
};

/**
 * Whether a JUnit test name names one of the suite's tests. JUnit names are the describe titles
 * followed by the test title, so with a suite title known the comparison covers both: a sibling
 * describe with a test of the same title must not match. A name that is the bare title still
 * does, for reporters that record no describes.
 */
const namesTest = (testName: string, suite: FlakySuite): boolean =>
  suite.tests.some(({ title }) => {
    const full = suite.suiteTitle ? `${suite.suiteTitle} ${title}` : title;
    return testName === full || testName.endsWith(` ${full}`) || testName === title;
  });

/** Suite issues first, then strongest match, open before closed, newest first. */
export const compareMatches = (a: MatchedIssue, b: MatchedIssue): number =>
  MATCH_STRENGTH[a.match] - MATCH_STRENGTH[b.match] ||
  (a.issue.state === b.issue.state ? 0 : a.issue.state === 'open' ? -1 : 1) ||
  b.issue.number - a.issue.number;

/**
 * Issues about the suite, strongest evidence first: a suite issue (about this suite, or about the
 * whole file, when it records no suite title), then the Scout test id, then
 * the test name together with the file (or, for Jest, the directory), then the test name together
 * with the file name alone (the file was moved), then any mention of the file.
 */
export const findMatchingIssues = (
  suite: FlakySuite,
  issues: readonly IssueDetails[]
): MatchedIssue[] => {
  const testIds = new Set(suite.tests.map((test) => test.testId));
  const directory = Path.dirname(suite.filePath);
  const baseName = Path.basename(suite.filePath);

  const matches: MatchedIssue[] = [];
  for (const details of issues) {
    const { issue, suiteFilePath, suiteTitle, suiteFramework, scoutTestId, filePath } = details;
    const { jestDirectory, testName, testFramework, text } = details;
    const mentionsFile = text.includes(suite.filePath);
    // A per-test issue is about this suite's test only if the frameworks agree, when known: a
    // Jest and a Playwright test in one directory may share a name
    const namesFlakyTest =
      testName !== undefined &&
      namesTest(testName, suite) &&
      (testFramework === undefined || testFramework === suite.framework);

    // An issue about the whole file is about each of its suites; one file can hold suites of
    // several frameworks, so a recorded framework has to agree too
    const aboutSuite =
      suiteFilePath === suite.filePath &&
      (suiteTitle === undefined || suiteTitle === suite.suiteTitle) &&
      (suiteFramework === undefined || suiteFramework === suite.framework);
    if (aboutSuite) {
      matches.push({ issue, match: 'suite' });
    } else if (scoutTestId !== undefined && testIds.has(scoutTestId)) {
      matches.push({ issue, match: 'test' });
    } else if (namesFlakyTest && (mentionsFile || jestDirectory === directory)) {
      matches.push({ issue, match: 'test' });
    } else if (namesFlakyTest && filePath !== undefined && Path.basename(filePath) === baseName) {
      matches.push({ issue, match: 'moved' });
    } else if (mentionsFile) {
      matches.push({ issue, match: 'file' });
    }
  }

  return matches.sort(compareMatches);
};
