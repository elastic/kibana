/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout } from 'timers/promises';

import type { ToolingLog } from '@kbn/tooling-log';

import { getScoutTestId, getTestFilePath, isScoutFailure } from './failure_identity';
import type { TestFailure } from './get_failures';
import type { GithubIssueMini } from './github_api';

export interface FailedTestIssue {
  classname: string;
  name: string;
  github: {
    nodeId: string;
    number: number;
    htmlUrl: string;
    body: string;
  };
}

/**
 * A flaky suite issue filed by `report_flaky_test_issues`, as ci-stats indexes it: about a test
 * file, or one `describe` block of it, rather than about one test.
 */
export interface FlakySuiteIssue {
  kind: 'suite';
  suite: {
    filePath: string;
    /** the `describe` block, absent when the issue is about the whole file */
    title?: string;
    framework?: string;
    /** Scout test ids of the tests that were flaky when the issue was filed or last updated */
    testIds: string[];
  };
  github: {
    nodeId: string;
    number: number;
    htmlUrl: string;
    state: 'open' | 'closed';
    /** as of the last issue event ci-stats saw; the fail count the job keeps is read from it */
    body: string;
  };
}

interface FindFailedTestIssuesResponse {
  existingIssues: FailedTestIssue[];
  /** missing from ci-stats versions that predate suite issues */
  suiteIssues?: FlakySuiteIssue[];
}

/**
 * How a failure identifies its test to ci-stats: per-test issues are matched on `classname` and
 * `name`, suite issues on `filePath` and `testId`.
 */
interface FailureIdentity {
  classname: string;
  name: string;
  filePath?: string;
  testId?: string;
}

const getFailureIdentity = (failure: TestFailure): FailureIdentity => ({
  classname: failure.classname,
  name: failure.name,
  filePath: getTestFilePath(failure),
  testId: getScoutTestId(failure),
});

/** The two fields ci-stats versions that predate suite issues accept */
const getLegacyFailureIdentity = ({ classname, name }: TestFailure): FailureIdentity => ({
  classname,
  name,
});

const getFramework = (failure: TestFailure): string | undefined =>
  isScoutFailure(failure) ? 'playwright' : failure.testType;

/**
 * Whether two failures are of the same test. Scout failures compare by test id, which a test keeps
 * across targets while tests that share a title in other suites do not; the rest by classname and
 * name.
 */
const isSameTest = (a: TestFailure, b: TestFailure): boolean => {
  if (isScoutFailure(a) && isScoutFailure(b)) {
    return a.id === b.id;
  }
  if (isScoutFailure(a) || isScoutFailure(b)) {
    return false;
  }
  return a.classname === b.classname && a.name === b.name;
};

/**
 * Whether the failure is inside the `describe` block a suite issue is about. Suite titles join
 * every `describe` title; a JUnit name starts with them, a Scout failure only knows the innermost.
 */
const isInDescribe = (failure: TestFailure, title: string): boolean =>
  isScoutFailure(failure)
    ? title === failure.classname || title.endsWith(` ${failure.classname}`)
    : failure.name === title || failure.name.startsWith(`${title} `);

const isAboutFailure = (issue: FlakySuiteIssue, failure: TestFailure): boolean => {
  const { suite } = issue;
  const framework = getFramework(failure);
  if (framework && suite.framework && framework !== suite.framework) {
    return false;
  }

  const testId = getScoutTestId(failure);
  if (testId && suite.testIds.includes(testId)) {
    return true;
  }

  // a test that became flaky after the issue was filed is only known by its file and describe block
  const filePath = getTestFilePath(failure);
  return (
    filePath !== undefined &&
    suite.filePath === filePath &&
    (suite.title === undefined || isInDescribe(failure, suite.title))
  );
};

export interface ExistingFailedTestIssue extends FailedTestIssue {
  github: FailedTestIssue['github'] & {
    body: string;
  };
}

const BASE_URL = 'https://ci-stats.kibana.dev';

/**
 * In order to deal with rate limits imposed on our Github API tokens we needed
 * to stop iterating through all the Github issues to find previously created issues
 * for a test failure. This class uses the ci-stats API to lookup the mapping between
 * failed tests and the existing failed-tests issues. The API maintains an index of
 * this mapping in ES to make much better use of the Github API.
 */
export class ExistingFailedTestIssues {
  private readonly results = new Map<TestFailure, ExistingFailedTestIssue | undefined>();
  /** by issue number, newest first */
  private suiteIssues: FlakySuiteIssue[] = [];
  /** false once ci-stats turned out to predate suite issues and reject their request fields */
  private askForSuiteIssues = true;

  constructor(private readonly log: ToolingLog) {}

  async loadForFailures(newFailures: TestFailure[]) {
    const unseenFailures: TestFailure[] = [];
    for (const failure of newFailures) {
      if (!this.isFailureSeen(failure)) {
        unseenFailures.push(failure);
      }
    }

    if (unseenFailures.length === 0) {
      this.log.debug('no unseen issues in new batch of failures');
      return;
    }

    this.log.debug('finding', unseenFailures.length, 'existing issues via ci-stats');
    const { existingIssues: failedTestIssues, suiteIssues = [] } = await this.findExistingIssues(
      unseenFailures
    );
    this.log.debug(
      'found',
      failedTestIssues.length,
      'existing issues and',
      suiteIssues.length,
      'suite issues'
    );
    this.addSuiteIssues(suiteIssues);

    const initialResultSize = this.results.size;
    for (const failure of unseenFailures) {
      const ciStatsIssue = failedTestIssues.find(
        (i) => i.classname === failure.classname && i.name === failure.name
      );
      if (!ciStatsIssue) {
        this.results.set(failure, undefined);
        continue;
      }

      this.results.set(failure, ciStatsIssue);
    }

    this.log.debug('loaded', this.results.size - initialResultSize, 'existing test issues');
  }

  isScoutFailure(failure: TestFailure): boolean {
    return isScoutFailure(failure);
  }

  /**
   * The flaky suite issue tracking the failure's test, if any: an open one before a closed one,
   * then one that lists the test's id before one that only covers its file and describe block,
   * then the newest.
   */
  getSuiteIssueForFailure(failure: TestFailure): FlakySuiteIssue | undefined {
    const testId = getScoutTestId(failure);
    const listsTest = (issue: FlakySuiteIssue): number =>
      testId !== undefined && issue.suite.testIds.includes(testId) ? 1 : 0;
    const isOpen = (issue: FlakySuiteIssue): number => (issue.github.state === 'open' ? 1 : 0);
    // suiteIssues are newest first and the sort is stable, so ties keep that order
    return this.suiteIssues
      .filter((issue) => isAboutFailure(issue, failure))
      .sort((a, b) => isOpen(b) - isOpen(a) || listsTest(b) - listsTest(a))[0];
  }

  getForFailure(failure: TestFailure) {
    for (const [f, issue] of this.results) {
      if (issue && isSameTest(f, failure)) {
        return issue;
      }
    }

    return undefined;
  }

  addNewlyCreated(failure: TestFailure, newIssue: GithubIssueMini) {
    this.results.set(failure, {
      classname: failure.classname,
      name: failure.name,
      github: {
        body: newIssue.body,
        htmlUrl: newIssue.html_url,
        nodeId: newIssue.node_id,
        number: newIssue.number,
      },
    });
  }

  private addSuiteIssues(suiteIssues: FlakySuiteIssue[]) {
    if (suiteIssues.length === 0) {
      return;
    }
    // the same issue can come back for several batches of failures
    const byNumber = new Map(this.suiteIssues.map((issue) => [issue.github.number, issue]));
    for (const issue of suiteIssues) {
      byNumber.set(issue.github.number, issue);
    }
    this.suiteIssues = [...byNumber.values()].sort((a, b) => b.github.number - a.github.number);
  }

  private async findExistingIssues(failures: TestFailure[]): Promise<FindFailedTestIssuesResponse> {
    if (failures.length === 0) {
      return { existingIssues: [] };
    }

    const maxAttempts = 5;
    let attempt = 0;
    while (true) {
      attempt += 1;

      const identities = failures.map(
        this.askForSuiteIssues ? getFailureIdentity : getLegacyFailureIdentity
      );
      let response: Response;
      try {
        response = await fetch(`${BASE_URL}/v1/find_failed_test_issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failures: identities }),
        });
      } catch (error: unknown) {
        // Network-level error (fetch throws TypeError for DNS/connection failures).
        if (attempt < maxAttempts) {
          this.log.error(error as Error);
          this.log.warning(`Failure talking to ci-stats, waiting ${attempt} before retrying`);
          await setTimeout(attempt * 1000);
          continue;
        }
        throw error;
      }

      if (!response.ok) {
        const text = await response.text();
        // ci-stats versions that predate suite issues reject the fields they don't know, so ask
        // them for per-test issues only, as before
        if (
          response.status === 400 &&
          this.askForSuiteIssues &&
          text.includes('unexpected fields')
        ) {
          this.log.warning(
            `ci-stats does not know suite issues yet, asking for per-test issues only`
          );
          this.askForSuiteIssues = false;
          continue;
        }
        // Server error: retry on 5xx, throw immediately on 4xx.
        if (attempt < maxAttempts && response.status >= 500) {
          this.log.warning(`Failure talking to ci-stats, waiting ${attempt} before retrying`);
          await setTimeout(attempt * 1000);
          continue;
        }
        throw new Error(`${response.status}:${text}`);
      }

      return (await response.json()) as FindFailedTestIssuesResponse;
    }
  }

  private isFailureSeen(failure: TestFailure) {
    for (const seen of this.results.keys()) {
      if (isSameTest(seen, failure)) {
        return true;
      }
    }

    return false;
  }
}
