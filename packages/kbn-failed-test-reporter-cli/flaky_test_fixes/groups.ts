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
  framework: TestFramework;
  filePath: string;
  suites: FlakySuite[];
  siblings: GithubIssue[];
  targets: GithubIssue[];
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
 * How an issue relates to a file group: a `suite` or `test` match is a target, any other issue
 * about the file a sibling. Issues filed before `test.type` was recorded name no framework, and
 * older Jest issues only their directory; the file path, or a flaky test named in that
 * directory, identifies them as the issue reporter does.
 */
export const associateIssue = (
  group: Pick<FixGroup, 'framework' | 'filePath' | 'suites'>,
  details: IssueDetails
): IssueAssociation | undefined => {
  const framework = issueFramework(details);
  if (framework && framework !== group.framework) return undefined;
  const matches = new Set(
    group.suites.flatMap((suite) => findMatchingIssues(suite, [details]).map(({ match }) => match))
  );
  const namesTest = matches.has('suite') || matches.has('test');
  const directory = Path.posix.dirname(group.filePath);
  const ownFile =
    details.suiteFilePath ??
    details.filePath ??
    (namesTest && details.jestDirectory === directory ? group.filePath : undefined);
  if (ownFile === group.filePath) return namesTest ? 'target' : 'sibling';
  if (namesTest || matches.has('moved') || (!ownFile && details.jestDirectory === directory)) {
    return 'ambiguous';
  }
  return undefined;
};

/** Group report candidates by file, but associate sibling issues independently of report admission. */
export const buildFixGroups = (report: FlakyTestReport, issues: GithubIssue[]): FixGroup[] => {
  const groups = new Map<string, FixGroup>();
  for (const suite of groupIntoSuites(report.flaky.filter((test) => !isSkippedTest(test)))) {
    const key = JSON.stringify([suite.framework, suite.filePath]);
    const group = groups.get(key) ?? {
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
    for (const details of candidates.values()) {
      const association = associateIssue(group, details);
      if (association === 'ambiguous') {
        group.ambiguous.push(details.issue);
      } else if (association) {
        group.siblings.push(details.issue);
        if (association === 'target') group.targets.push(details.issue);
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
