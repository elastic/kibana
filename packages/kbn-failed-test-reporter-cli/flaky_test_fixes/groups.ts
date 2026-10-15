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
} from '../flaky_test_issues/match_issues';
import { isSkippedTest } from '../flaky_test_issues/skipped';
import { groupIntoSuites, type FlakySuite } from '../flaky_test_issues/suites';

export interface FixGroup {
  key: string;
  framework: TestFramework;
  filePath: string;
  suites: FlakySuite[];
  siblings: GithubIssue[];
  targets: GithubIssue[];
  ambiguous: number[];
}

export const groupKey = (repo: string, framework: string, filePath: string): string =>
  encodeURIComponent(JSON.stringify([repo, framework, filePath]));

export const issueFramework = (details: IssueDetails): string | undefined =>
  details.suiteFramework ??
  details.testFramework ??
  (details.scoutTestId ? 'playwright' : details.jestDirectory ? 'jest' : undefined);

export const isTestFilePath = (filePath: string): boolean =>
  !Path.posix.isAbsolute(filePath) &&
  Path.posix.normalize(filePath) === filePath &&
  !filePath.startsWith('../') &&
  !filePath.includes('\\') &&
  /\.[cm]?[jt]sx?$/.test(filePath);

/** Group report candidates by file, but associate sibling issues independently of report admission. */
export const buildFixGroups = (
  report: FlakyTestReport,
  issues: GithubIssue[],
  repo: string
): FixGroup[] => {
  const groups = new Map<string, FixGroup>();
  for (const suite of groupIntoSuites(report.flaky.filter((test) => !isSkippedTest(test)))) {
    const key = groupKey(repo, suite.framework, suite.filePath);
    const group = groups.get(key) ?? {
      key,
      framework: suite.framework,
      filePath: suite.filePath,
      suites: [],
      siblings: [],
      targets: [],
      ambiguous: [],
    };
    group.suites.push(suite);
    groups.set(key, group);
  }

  const index = indexIssues(issues.map(describeIssue));
  for (const group of groups.values()) {
    const candidates = new Map(
      group.suites.flatMap((suite) =>
        candidateIssues(suite, index).map((details) => [details.issue.number, details] as const)
      )
    );
    const targetMatches = new Set(
      group.suites.flatMap((suite) =>
        findMatchingIssues(suite, [...candidates.values()])
          .filter(({ match }) => match === 'suite' || match === 'test')
          .map(({ issue }) => issue.number)
      )
    );
    for (const details of candidates.values()) {
      const framework = issueFramework(details);
      if (framework && framework !== group.framework) continue;
      const ownFile = details.suiteFilePath ?? details.filePath;
      if (ownFile === group.filePath && framework === group.framework) {
        group.siblings.push(details.issue);
        if (targetMatches.has(details.issue.number)) group.targets.push(details.issue);
      } else if (
        ownFile === group.filePath ||
        targetMatches.has(details.issue.number) ||
        (!ownFile && details.jestDirectory === Path.posix.dirname(group.filePath)) ||
        group.suites.some((suite) =>
          findMatchingIssues(suite, [details]).some(({ match }) => match === 'moved')
        )
      ) {
        group.ambiguous.push(details.issue.number);
      }
    }
    group.targets.sort(
      (a, b) =>
        Number(!describeIssue(a).suiteFilePath) - Number(!describeIssue(b).suiteFilePath) ||
        a.number - b.number
    );
  }
  return [...groups.values()];
};
