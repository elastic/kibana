/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { GithubApi, GithubIssue } from '../failed_tests_reporter/github_api';
import {
  candidateIssues,
  findMatchingIssues,
  type IssueIndex,
  type MatchableSuite,
  type MatchedIssue,
} from './match_issues';

/** The label `/skip` adds; such an issue stays open until its test is unskipped. */
export const SKIPPED_TEST_LABEL = 'skipped-test';

const labelName = (label: unknown): string | undefined => {
  if (typeof label === 'string') {
    return label;
  }
  const name = typeof label === 'object' && label !== null && 'name' in label && label.name;
  return typeof name === 'string' ? name : undefined;
};

/** An open per-test issue about one of a suite's tests, which no longer tracks it once handed over. */
export const isOpenPerTestIssue = ({ issue, match }: MatchedIssue): boolean =>
  (match === 'test' || match === 'moved') && issue.state === 'open';

/** One the suite's issue takes over; the issue of a skipped test is left open, as it tracks the skip. */
export const isHandedOver = (matched: MatchedIssue): boolean =>
  isOpenPerTestIssue(matched) &&
  !matched.issue.labels.some((label) => labelName(label) === SKIPPED_TEST_LABEL);

/** The per-test issues the suite's issue takes over (`isHandedOver`), each once. */
export const perTestIssuesToHandOver = (
  suite: MatchableSuite,
  index: IssueIndex
): GithubIssue[] => {
  const byNumber = new Map<number, GithubIssue>();
  for (const test of suite.tests) {
    const single = { ...suite, tests: [test] };
    for (const matched of findMatchingIssues(single, candidateIssues(single, index))) {
      if (isHandedOver(matched)) {
        byNumber.set(matched.issue.number, matched.issue);
      }
    }
  }
  return [...byNumber.values()];
};

export interface HandOverOptions {
  github: GithubApi;
  log: ToolingLog;
  dryRun: boolean;
  issues: readonly GithubIssue[];
  suiteIssue: { number: number; id: number };
}

/**
 * Closes each per-test issue as a duplicate of the suite issue, rather than commenting: the
 * failed-test Slack alert would take the reporter's comment on a per-test issue for a new failure.
 * Each issue closed is marked so in place, so that later suites of the run see it closed. A failed
 * close is logged and the issue left open for the next run. Returns the issues closed.
 */
export const handOver = async ({
  github,
  log,
  dryRun,
  issues,
  suiteIssue,
}: HandOverOptions): Promise<GithubIssue[]> => {
  const closed: GithubIssue[] = [];
  for (const issue of issues) {
    try {
      await github.closeAsDuplicate(issue.number, suiteIssue.id);
    } catch (error) {
      log.warning(
        `failed to close #${issue.number} as a duplicate of #${suiteIssue.number}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }
    Object.assign(issue, { state: 'closed', state_reason: 'duplicate' });
    log.info(
      `${dryRun ? 'would close' : 'closed'} #${issue.number} as a duplicate of #${
        suiteIssue.number
      }`
    );
    closed.push(issue);
  }
  return closed;
};
