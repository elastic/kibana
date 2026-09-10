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
import { checkFlakySuiteIssues, FAILED_TEST_LABEL, indexSuiteIssues } from './checker';
import { flakyReport, flakyTest, githubIssue, SUITE_PATH } from './test_fixtures';

jest.mock('../failed_tests_reporter/github_api');
const { GithubApi } = jest.requireMock('../failed_tests_reporter/github_api');

const log = new ToolingLog();

const createGithubApi = (openIssues: GithubIssue[] = []) => {
  const api = new GithubApi();
  api.listIssues.mockResolvedValue(openIssues);
  return api;
};

const suiteIssue = (number: number, filePath = SUITE_PATH) =>
  githubIssue({ number, title: `Flaky Scout test suite: ${filePath}` });

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

describe('checkFlakySuiteIssues', () => {
  it('tells tracked, related and untracked suites apart, worst suites first', async () => {
    const github = createGithubApi([
      suiteIssue(42, 'tracked.spec.ts'),
      scoutTestIssue(43, 'mid-1', 'mid.spec.ts'),
      scoutTestIssue(44, 'unrelated', 'elsewhere.spec.ts'),
    ]);
    const report = flakyReport([
      flakyTest({ filePath: 'low.spec.ts', testId: 'low-1', failedBuilds: 2 }),
      flakyTest({ filePath: 'tracked.spec.ts', testId: 'tracked-1', failedBuilds: 20 }),
      flakyTest({ filePath: 'mid.spec.ts', testId: 'mid-1', failedBuilds: 10 }),
      flakyTest({ filePath: 'mid.spec.ts', testId: 'mid-2', failedBuilds: 3 }),
    ]);

    const summary = await checkFlakySuiteIssues({ report, github, log });

    expect(github.listIssues).toHaveBeenCalledWith({ labels: [FAILED_TEST_LABEL], state: 'open' });
    expect(summary.suites).toBe(3);
    expect(summary.openIssues).toBe(3);
    expect(summary.counts).toEqual({ tracked: 1, related: 1, untracked: 1 });
    expect(summary.results).toEqual([
      {
        status: 'tracked',
        filePath: 'tracked.spec.ts',
        issue: {
          number: 42,
          url: 'https://github.com/elastic/kibana/issues/42',
          title: 'Flaky Scout test suite: tracked.spec.ts',
        },
      },
      {
        status: 'related',
        filePath: 'mid.spec.ts',
        issues: [
          {
            number: 43,
            url: 'https://github.com/elastic/kibana/issues/43',
            title: 'Failing test: Suite - test mid-1',
            match: 'test',
          },
        ],
      },
      { status: 'untracked', filePath: 'low.spec.ts' },
    ]);
  });

  it('prefers the suite issue and does not also list it as a related issue', async () => {
    const github = createGithubApi([
      githubIssue({ number: 1, title: `Flaky Scout test suite: ${SUITE_PATH}`, body: SUITE_PATH }),
    ]);
    const summary = await checkFlakySuiteIssues({
      report: flakyReport([flakyTest()]),
      github,
      log,
    });

    expect(summary.results[0].status).toBe('tracked');
  });

  it('never writes to GitHub', async () => {
    const github = createGithubApi();
    await checkFlakySuiteIssues({ report: flakyReport([flakyTest()]), github, log });

    expect(github.createIssue).not.toHaveBeenCalled();
    expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
    expect(github.addIssueComment).not.toHaveBeenCalled();
  });
});
