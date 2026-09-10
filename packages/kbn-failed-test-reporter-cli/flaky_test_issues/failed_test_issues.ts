/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { getLocationFromClassname } from '../failed_tests_reporter/get_failures';
import type { GithubIssue } from '../failed_tests_reporter/github_api';
import { getIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import type { FlakySuite } from './suites';

/**
 * What a per-test `failed-test` issue, as filed by `report_failed_tests`, says about its test.
 * Every field is best effort: older issues lack some metadata, hand-written ones lack all of it.
 */
export interface FailedTestIssueDetails {
  issue: GithubIssue;
  /** Scout test id from the `Test ID` row; the same id `discover-flaky-tests` reports. */
  scoutTestId?: string;
  /** File the issue names: the Scout `Location` row or the `<path>·ts` ending an FTR classname. */
  filePath?: string;
  /** Directory named by a Jest classname (`Jest Tests.<dir>`); Jest issues do not name the file. */
  jestDirectory?: string;
  /** Full test name from the metadata, i.e. the describe blocks followed by the test title. */
  testName?: string;
  /** Title and body with JUnit's `·` restored to `.`, so file paths can be looked up in it. */
  text: string;
}

export type FailedTestIssueMatch =
  /** The issue is about one of the suite's flaky tests. */
  | 'test'
  /** Same test and file name, but the issue names an old location: the file was moved since. */
  | 'moved'
  /** The issue names the suite's file but a different test, or one that could not be matched. */
  | 'file';

export interface RelatedFailedTestIssue {
  issue: GithubIssue;
  match: FailedTestIssueMatch;
}

const MATCH_STRENGTH: Record<FailedTestIssueMatch, number> = { test: 0, moved: 1, file: 2 };
const JEST_CLASS_PREFIX = 'Jest Tests.';
const SCOUT_TEST_ID_ROW = /^\|\s*Test ID\s*\|\s*(\S+)\s*\|/m;
const LOCATION_ROW = /^\|\s*Location\s*\|\s*(\S+)\s*\|/m;
const SOURCE_FILE = /\.(tsx?|jsx?)$/;

const undot = (value: string): string => value.replace(/·/g, '.');

const metadataString = (body: string, key: string): string | undefined => {
  const value: unknown = getIssueMetadata(body, key);
  return typeof value === 'string' ? value : undefined;
};

/** Extracts the matching keys of a per-test issue once, so every suite can be checked cheaply. */
export const describeFailedTestIssue = (issue: GithubIssue): FailedTestIssueDetails => {
  const className = metadataString(issue.body, 'test.class') ?? '';
  // FTR classnames end in the file (`<report>.<path>·ts`), Jest ones in the directory
  const classLocation = getLocationFromClassname(className);
  const location = issue.body.match(LOCATION_ROW)?.[1];
  return {
    issue,
    scoutTestId: issue.body.match(SCOUT_TEST_ID_ROW)?.[1],
    filePath: location
      ? undot(location)
      : SOURCE_FILE.test(classLocation)
      ? classLocation
      : undefined,
    jestDirectory: className.startsWith(JEST_CLASS_PREFIX) ? classLocation : undefined,
    testName: metadataString(issue.body, 'test.name'),
    text: undot(`${issue.title}\n${issue.body}`),
  };
};

/** Whether a full JUnit test name (`describe … title`) ends with the flaky test's title. */
const namesTest = (testName: string, titles: readonly string[]): boolean =>
  titles.some((title) => testName === title || testName.endsWith(` ${title}`));

/**
 * Open per-test issues about the suite, strongest evidence first: the Scout test id, then the
 * test name together with the file (or, for Jest, the directory), then the test name together
 * with the file name alone (the file was moved), then any mention of the file.
 */
export const findRelatedFailedTestIssues = (
  suite: FlakySuite,
  issues: readonly FailedTestIssueDetails[]
): RelatedFailedTestIssue[] => {
  const testIds = new Set(suite.tests.map((test) => test.testId));
  const titles = suite.tests.map((test) => test.title);
  const directory = Path.dirname(suite.filePath);
  const baseName = Path.basename(suite.filePath);

  const related: RelatedFailedTestIssue[] = [];
  for (const details of issues) {
    const { issue, scoutTestId, filePath, jestDirectory, testName, text } = details;
    const mentionsFile = text.includes(suite.filePath);
    const namesFlakyTest = testName !== undefined && namesTest(testName, titles);

    if (scoutTestId !== undefined && testIds.has(scoutTestId)) {
      related.push({ issue, match: 'test' });
    } else if (namesFlakyTest && (mentionsFile || jestDirectory === directory)) {
      related.push({ issue, match: 'test' });
    } else if (namesFlakyTest && filePath !== undefined && Path.basename(filePath) === baseName) {
      related.push({ issue, match: 'moved' });
    } else if (mentionsFile) {
      related.push({ issue, match: 'file' });
    }
  }

  return related.sort(
    (a, b) => MATCH_STRENGTH[a.match] - MATCH_STRENGTH[b.match] || b.issue.number - a.issue.number
  );
};
