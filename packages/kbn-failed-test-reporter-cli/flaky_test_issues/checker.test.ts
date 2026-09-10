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
import { checkFlakySuiteIssues, indexSuiteIssues, suiteIssuesQuery } from './checker';
import { flakyReport, flakyTest, githubIssue, SUITE_PATH } from './test_fixtures';

jest.mock('../failed_tests_reporter/github_api');
const { GithubApi } = jest.requireMock('../failed_tests_reporter/github_api');

const log = new ToolingLog();

const createGithubApi = (suiteIssues: GithubIssue[] = []) => {
  const api = new GithubApi();
  api.searchIssues.mockResolvedValue(suiteIssues);
  return api;
};

const suiteIssue = (number: number, filePath = SUITE_PATH) =>
  githubIssue({ number, title: `Flaky Scout test suite: ${filePath}` });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('indexSuiteIssues', () => {
  it('keys issues by the suite file in their title, newest first, ignoring other titles', () => {
    const index = indexSuiteIssues([
      suiteIssue(1),
      suiteIssue(3),
      suiteIssue(2),
      githubIssue({ number: 4, title: 'Failing test: something else' }),
    ]);

    expect([...index.keys()]).toEqual([SUITE_PATH]);
    expect(index.get(SUITE_PATH)?.number).toBe(3);
  });
});

describe('suiteIssuesQuery', () => {
  it('narrows open failed-test issues down by the title words', () => {
    expect(suiteIssuesQuery()).toBe('label:failed-test is:open in:title "Flaky" "test suite"');
  });
});

describe('checkFlakySuiteIssues', () => {
  it('tells tracked suites from untracked ones, worst suites first', async () => {
    const github = createGithubApi([suiteIssue(42, 'tracked.spec.ts')]);
    const report = flakyReport([
      flakyTest({ filePath: 'low.spec.ts', failedBuilds: 2 }),
      flakyTest({ filePath: 'tracked.spec.ts', failedBuilds: 20 }),
      flakyTest({ filePath: 'mid.spec.ts', failedBuilds: 10 }),
      flakyTest({ filePath: 'mid.spec.ts', failedBuilds: 3, testId: 'other' }),
    ]);

    const summary = await checkFlakySuiteIssues({ report, github, log });

    expect(github.searchIssues).toHaveBeenCalledWith({ query: suiteIssuesQuery() });
    expect(summary.suites).toBe(3);
    expect(summary.counts).toEqual({ tracked: 1, untracked: 2 });
    expect(summary.results).toEqual([
      {
        status: 'tracked',
        filePath: 'tracked.spec.ts',
        issue: { number: 42, url: 'https://github.com/elastic/kibana/issues/42' },
      },
      { status: 'untracked', filePath: 'mid.spec.ts' },
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
