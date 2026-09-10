/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { GithubIssue } from '../failed_tests_reporter/github_api';
import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { checkFlakySuiteIssues, suiteSearchQueries } from './checker';
import { flakyReport, flakyTest, githubIssue, SUITE_PATH } from './test_fixtures';

jest.mock('../failed_tests_reporter/github_api');
const { GithubApi } = jest.requireMock('../failed_tests_reporter/github_api');

const log = new ToolingLog();

/** Serves every search from one set of issues, as if each mentioned every file name. */
const createGithubApi = (issues: GithubIssue[] = []) => {
  const api = new GithubApi();
  api.searchIssues.mockResolvedValue(issues);
  return api;
};

const suiteIssue = (number: number, filePath = SUITE_PATH, state: GithubIssue['state'] = 'open') =>
  githubIssue({ number, title: `Flaky Scout test suite: ${filePath}`, state });

const scoutTestIssue = (number: number, testId: string, filePath = SUITE_PATH) =>
  githubIssue({
    number,
    title: `Failing test: Suite - test ${testId}`,
    body: updateIssueMetadata(`| Test ID | ${testId} |\n| Location | ${filePath} |`, {
      'test.class': 'Suite',
      'test.name': `test ${testId}`,
      'test.type': 'scout',
    }),
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('suiteSearchQueries', () => {
  it('searches failed-test issues by file name, as many per query as the length limit allows', () => {
    const suites = [
      { filePath: 'x-pack/a/first.spec.ts' },
      { filePath: 'x-pack/b/first.spec.ts' },
      { filePath: 'src/c/second.test.ts' },
      { filePath: 'x-pack/d/third.ts' },
    ];

    expect(suiteSearchQueries(suites, 60)).toEqual([
      'label:failed-test "first.spec.ts" OR "second.test.ts"',
      'label:failed-test "third.ts"',
    ]);
    expect(suiteSearchQueries(suites)).toEqual([
      'label:failed-test "first.spec.ts" OR "second.test.ts" OR "third.ts"',
    ]);
    expect(suiteSearchQueries([])).toEqual([]);
  });
});

describe('checkFlakySuiteIssues', () => {
  it('lists every issue about a suite, open or closed, and tells untracked suites apart', async () => {
    const github = createGithubApi([
      suiteIssue(42, 'tracked.spec.ts', 'closed'),
      scoutTestIssue(43, 'tracked-1', 'tracked.spec.ts'),
      scoutTestIssue(44, 'mid-1', 'mid.spec.ts'),
      scoutTestIssue(45, 'unrelated', 'elsewhere.spec.ts'),
    ]);
    const report = flakyReport([
      flakyTest({ filePath: 'low.spec.ts', testId: 'low-1', failedBuilds: 2 }),
      flakyTest({ filePath: 'tracked.spec.ts', testId: 'tracked-1', failedBuilds: 20 }),
      flakyTest({ filePath: 'mid.spec.ts', testId: 'mid-1', failedBuilds: 10 }),
      flakyTest({ filePath: 'mid.spec.ts', testId: 'mid-2', failedBuilds: 3 }),
    ]);

    const summary = await checkFlakySuiteIssues({ report, github, log });

    expect(github.searchIssues).toHaveBeenCalledTimes(1);
    expect(github.searchIssues).toHaveBeenCalledWith({
      query: 'label:failed-test "tracked.spec.ts" OR "mid.spec.ts" OR "low.spec.ts"',
    });
    expect(summary.suites).toBe(3);
    expect(summary.candidateIssues).toBe(4);
    expect(summary.counts).toEqual({ tracked: 2, untracked: 1 });
    expect(summary.results).toEqual([
      {
        status: 'tracked',
        filePath: 'tracked.spec.ts',
        issues: [
          {
            number: 42,
            url: 'https://github.com/elastic/kibana/issues/42',
            title: 'Flaky Scout test suite: tracked.spec.ts',
            state: 'closed',
            match: 'suite',
          },
          {
            number: 43,
            url: 'https://github.com/elastic/kibana/issues/43',
            title: 'Failing test: Suite - test tracked-1',
            state: 'open',
            match: 'test',
          },
        ],
      },
      {
        status: 'tracked',
        filePath: 'mid.spec.ts',
        issues: [
          {
            number: 44,
            url: 'https://github.com/elastic/kibana/issues/44',
            title: 'Failing test: Suite - test mid-1',
            state: 'open',
            match: 'test',
          },
        ],
      },
      { status: 'untracked', filePath: 'low.spec.ts' },
    ]);
  });

  it('never writes to GitHub', async () => {
    const github = createGithubApi();
    await checkFlakySuiteIssues({ report: flakyReport([flakyTest()]), github, log });

    expect(github.createIssue).not.toHaveBeenCalled();
    expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
    expect(github.addIssueComment).not.toHaveBeenCalled();
  });
});
