/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { FlakyTestReport, TestFramework } from '@kbn/scout-reporting';
import type { GithubIssue } from '../failed_tests_reporter/github_api';
import {
  candidateIssues,
  describeIssue,
  findMatchingIssues,
  indexIssues,
  type IssueDetails,
  type IssueIndex,
} from '../flaky_test_issues/match_issues';
import { isSkippedTest } from '../flaky_test_issues/skipped';
import { groupIntoSuites, type FlakySuite } from '../flaky_test_issues/suites';

/** The report's flaky suites of one framework and test file. */
export interface FlakyFile {
  framework: TestFramework;
  filePath: string;
  suites: FlakySuite[];
}

export interface FixGroup extends FlakyFile {
  /** Issues confidently about the file, whose history counts, whether reported today or not. */
  siblings: GithubIssue[];
  /** Siblings matched to a flaky suite or test of the report: the ones a first request may go to. */
  targets: GithubIssue[];
  /** Issues that may be about the file, but cannot safely be told apart. */
  ambiguous: GithubIssue[];
}

/** A request target, an issue whose history counts, or one whose identity cannot be told. */
export type IssueAssociation = 'target' | 'sibling' | 'ambiguous';

const issueFramework = (details: IssueDetails): string | undefined =>
  details.suiteFramework ??
  details.testFramework ??
  (details.scoutTestId ? 'playwright' : details.jestDirectory ? 'jest' : undefined);

export const isTestFilePath = (filePath: string): boolean =>
  !Path.posix.isAbsolute(filePath) &&
  Path.posix.normalize(filePath) === filePath &&
  !filePath.startsWith('../') &&
  !filePath.includes('\\') &&
  /\.[cm]?[jt]sx?$/.test(filePath);

/**
 * How an issue relates to a file: a `suite` or `test` match is a target, any other issue about
 * the file a sibling. Issues filed before `test.type` was recorded name no framework, and older
 * Jest issues only their directory; the file path, or a flaky test named in that directory,
 * identifies them as the issue reporter does.
 */
export const associateIssue = (
  file: FlakyFile,
  details: IssueDetails
): IssueAssociation | undefined => {
  const framework = issueFramework(details);
  if (framework && framework !== file.framework) return undefined;
  const matches = new Set(
    file.suites.flatMap((suite) => findMatchingIssues(suite, [details]).map(({ match }) => match))
  );
  const namesTest = matches.has('suite') || matches.has('test');
  const directory = Path.posix.dirname(file.filePath);
  const ownFile =
    details.suiteFilePath ??
    details.filePath ??
    (namesTest && details.jestDirectory === directory ? file.filePath : undefined);
  if (ownFile === file.filePath) return namesTest ? 'target' : 'sibling';
  if (namesTest || matches.has('moved') || (!ownFile && details.jestDirectory === directory)) {
    return 'ambiguous';
  }
  return undefined;
};

/** The report's flaky suites, without skipped tests, by framework and file, worst first. */
const groupSuitesByFile = (report: FlakyTestReport): FlakyFile[] => {
  const files = new Map<string, FlakyFile>();
  for (const suite of groupIntoSuites(report.flaky.filter((test) => !isSkippedTest(test)))) {
    const key = JSON.stringify([suite.framework, suite.filePath]);
    const file = files.get(key) ?? {
      framework: suite.framework,
      filePath: suite.filePath,
      suites: [],
    };
    file.suites.push(suite);
    files.set(key, file);
  }
  return [...files.values()];
};

/** Before any history, a suite issue represents the file better than a per-test one. */
const suiteIssuesFirst = (a: IssueDetails, b: IssueDetails): number =>
  Number(!a.suiteFilePath) - Number(!b.suiteFilePath) || a.issue.number - b.issue.number;

const associateIssues = (file: FlakyFile, index: IssueIndex): FixGroup => {
  const candidates = new Map(
    file.suites.flatMap((suite) =>
      candidateIssues(suite, index).map((details) => [details.issue.number, details] as const)
    )
  );
  const group: FixGroup = { ...file, siblings: [], targets: [], ambiguous: [] };
  const targets: IssueDetails[] = [];
  for (const details of candidates.values()) {
    const association = associateIssue(file, details);
    if (association === 'ambiguous') group.ambiguous.push(details.issue);
    if (association === 'sibling' || association === 'target') group.siblings.push(details.issue);
    if (association === 'target') targets.push(details);
  }
  group.targets = targets.sort(suiteIssuesFirst).map(({ issue }) => issue);
  return group;
};

/** Group report candidates by file, but associate sibling issues independently of report admission. */
export const buildFixGroups = (report: FlakyTestReport, issues: GithubIssue[]): FixGroup[] => {
  const index = indexIssues(issues.map(describeIssue));
  return groupSuitesByFile(report).map((file) => associateIssues(file, index));
};
