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
import { getIssueMetadata, updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { FLAKY_TEST_SUITE_METADATA_PREFIX, type FlakySuiteIssueMetadata } from './issue_body';
import { previouslyTrackedIn } from './markdown';
import {
  candidateIssues,
  findMatchingIssues,
  type IssueIndex,
  type MatchableSuite,
  type MatchedIssue,
} from './match_issues';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

/** The per-test issues the suite's issue takes over (`isHandedOver`), by the id of their test. */
export const perTestIssuesByTest = (
  suite: MatchableSuite,
  index: IssueIndex
): Map<string, GithubIssue[]> => {
  const byTest = new Map<string, GithubIssue[]>();
  for (const test of suite.tests) {
    const single = { ...suite, tests: [test] };
    const issues = findMatchingIssues(single, candidateIssues(single, index))
      .filter(isHandedOver)
      .map(({ issue }) => issue);
    if (issues.length > 0) {
      byTest.set(test.testId, issues);
    }
  }
  return byTest;
};

/** Each of the issues once, in the order first seen. */
export const distinctIssues = (issues: readonly GithubIssue[]): GithubIssue[] => [
  ...new Map(issues.map((issue) => [issue.number, issue])).values(),
];

const PREVIOUS_ISSUES: keyof FlakySuiteIssueMetadata = 'suite.previousIssues';
const NEW_PREVIOUS_ISSUES: keyof FlakySuiteIssueMetadata = 'report.newPreviousIssues';
const PREVIOUSLY_TRACKED_LINE = /\n\nPreviously tracked in #[^\n]*/g;
const METADATA_START = '\n\n<!-- kibanaCiData = ';

const recordedNumbers = (body: string, key: keyof FlakySuiteIssueMetadata): number[] => {
  const value: unknown = getIssueMetadata(body, key, undefined, FLAKY_TEST_SUITE_METADATA_PREFIX);
  return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
};

/** The body's text and hidden metadata, which stays last. */
const splitBody = (body: string): [text: string, metadata: string] => {
  const start = body.indexOf(METADATA_START);
  return start === -1 ? [body, ''] : [body.slice(0, start), body.slice(start)];
};

/** The numbers its "Previously tracked in" line lists, for a body that recorded none. */
const numbersInLine = (body: string): number[] =>
  (splitBody(body)[0].match(PREVIOUSLY_TRACKED_LINE) ?? []).flatMap((line) =>
    [...line.matchAll(/#(\d+)/g)].map(([, number]) => Number(number))
  );

/** The body with its "Previously tracked in" line, at the end of its text, listing `numbers`. */
const withPreviouslyTrackedLine = (body: string, numbers: readonly number[]): string => {
  const [text, metadata] = splitBody(body);
  return `${text.replace(PREVIOUSLY_TRACKED_LINE, '')}\n\n${previouslyTrackedIn(
    numbers
  )}${metadata}`;
};

export interface TakenOver {
  body: string;
  /** The issues the comment posted with this body names as previously tracking the suite. */
  announced: number[];
}

/**
 * The body of a suite issue that takes over `numbers` after it was filed: those it doesn't list yet
 * join its "Previously tracked in" line, and the issues the next comment names. With `commenting`,
 * the comment posted along with the body names them, and those taken over since the last comment.
 * The tests table stays as filed.
 */
export const takeOver = (
  body: string,
  numbers: readonly number[],
  commenting: boolean
): TakenOver => {
  const listed = [...new Set([...recordedNumbers(body, PREVIOUS_ISSUES), ...numbersInLine(body)])];
  const added = numbers.filter((number) => !listed.includes(number));
  const unannounced = [...recordedNumbers(body, NEW_PREVIOUS_ISSUES), ...added];
  if (added.length === 0 && (!commenting || unannounced.length === 0)) {
    return { body, announced: [] };
  }
  const previous = [...listed, ...added];
  return {
    body: updateIssueMetadata(
      added.length > 0 ? withPreviouslyTrackedLine(body, previous) : body,
      {
        [PREVIOUS_ISSUES]: previous,
        // undefined drops the key from the JSON once a comment names them
        [NEW_PREVIOUS_ISSUES]: commenting ? undefined : unannounced,
      },
      FLAKY_TEST_SUITE_METADATA_PREFIX
    ),
    announced: commenting ? unannounced : [],
  };
};

/** The comment, followed by the issues it names as previously tracking the suite. */
export const withPreviouslyTracked = (comment: string, numbers: readonly number[]): string =>
  numbers.length > 0 ? `${comment}\n\n${previouslyTrackedIn(numbers)}` : comment;

/** The comment on a per-test issue closed as a duplicate of its suite's issue. */
export const handOverComment = (suiteIssueNumber: number): string =>
  `Now tracked in #${suiteIssueNumber}, together with the other tests of its suite. New ` +
  'failures will be reported there, so this issue is closed as a duplicate.';

export interface HandOverOptions {
  github: GithubApi;
  log: ToolingLog;
  dryRun: boolean;
  issues: readonly GithubIssue[];
  suiteIssue: { number: number; id: number };
}

/**
 * Closes each per-test issue as a duplicate of the suite issue, then says so in a comment. The
 * close comes first: the failed-test Slack alert and investigator skip comments on closed issues,
 * and would take the reporter's comment on an open per-test issue for a new failure. Each issue
 * closed is marked so in place, so that later suites of the run see it closed. A failed close is
 * logged and the issue left open for the next run; a failed comment is only logged. Returns the
 * issues closed.
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
        `failed to close #${issue.number} as a duplicate of #${suiteIssue.number}: ${errorMessage(
          error
        )}`
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
    try {
      await github.addIssueComment(issue.number, handOverComment(suiteIssue.number));
    } catch (error) {
      log.warning(`failed to comment on #${issue.number}: ${errorMessage(error)}`);
    }
  }
  return closed;
};
