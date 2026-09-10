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
import { readSuiteFilePath, renderFlakySuiteIssueBody } from './issue_body';
import {
  FAILED_TEST_LABEL,
  indexSuiteIssues,
  reportFlakySuitesToGithub,
  suiteIssuesQuery,
  type ReportFlakySuitesOptions,
} from './reporter';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, githubIssue, SUITE_PATH } from './test_fixtures';

jest.mock('../failed_tests_reporter/github_api');
const { GithubApi } = jest.requireMock('../failed_tests_reporter/github_api');

const log = new ToolingLog();

const createGithubApi = (suiteIssues: GithubIssue[] = []) => {
  const api = new GithubApi();
  api.searchIssues.mockResolvedValue(suiteIssues);
  api.createIssue.mockImplementation(async (title: string) => ({
    number: 900,
    html_url: 'https://github.com/elastic/kibana/issues/900',
    node_id: 'new',
    body: title,
  }));
  return api;
};

/** A body as written by an earlier run, so metadata lookups find the suite. */
const suiteIssueBody = (tests = [flakyTest()]) =>
  renderFlakySuiteIssueBody(groupIntoSuites(tests)[0], { report: flakyReport(tests) });

const options = (
  github: ReturnType<typeof createGithubApi>,
  overrides: Partial<ReportFlakySuitesOptions> = {}
): ReportFlakySuitesOptions => ({
  report: flakyReport([flakyTest()]),
  github,
  log,
  labels: [FAILED_TEST_LABEL],
  maxNewIssues: 10,
  dryRun: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('indexSuiteIssues', () => {
  it('keys issues by the suite file in their metadata, newest first, ignoring other bodies', () => {
    const body = suiteIssueBody();
    const index = indexSuiteIssues([
      githubIssue({ number: 1, body }),
      githubIssue({ number: 3, body }),
      githubIssue({ number: 2, body }),
      githubIssue({ number: 4, body: 'not ours' }),
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

describe('reportFlakySuitesToGithub', () => {
  it('creates an issue for a new suite', async () => {
    const github = createGithubApi();
    const summary = await reportFlakySuitesToGithub(
      options(github, { reportUrl: 'https://buildkite.com/elastic/p/builds/1' })
    );

    expect(github.searchIssues).toHaveBeenCalledWith({ query: suiteIssuesQuery() });
    expect(github.createIssue).toHaveBeenCalledTimes(1);
    const [title, body, labels] = github.createIssue.mock.calls[0];
    expect(title).toBe(`Flaky Scout test suite: ${SUITE_PATH}`);
    expect(labels).toEqual([FAILED_TEST_LABEL]);
    expect(readSuiteFilePath(body)).toBe(SUITE_PATH);
    expect(body).toContain('https://buildkite.com/elastic/p/builds/1');
    expect(summary.counts).toEqual({ created: 1, existing: 0, skipped: 0 });
    expect(summary.actions).toEqual([
      {
        action: 'created',
        filePath: SUITE_PATH,
        issue: { number: 900, url: 'https://github.com/elastic/kibana/issues/900' },
      },
    ]);
  });

  it('leaves a suite with an open issue untouched', async () => {
    const github = createGithubApi([githubIssue({ number: 42, body: suiteIssueBody() })]);
    const summary = await reportFlakySuitesToGithub(options(github));

    expect(github.createIssue).not.toHaveBeenCalled();
    expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
    expect(github.addIssueComment).not.toHaveBeenCalled();
    expect(summary.counts).toEqual({ created: 0, existing: 1, skipped: 0 });
    expect(summary.actions).toEqual([
      {
        action: 'existing',
        filePath: SUITE_PATH,
        issue: { number: 42, url: 'https://github.com/elastic/kibana/issues/42' },
      },
    ]);
  });

  it('caps the number of issues created per run, worst suites first', async () => {
    const github = createGithubApi();
    const report = flakyReport([
      flakyTest({ filePath: 'low.spec.ts', failedBuilds: 2 }),
      flakyTest({ filePath: 'high.spec.ts', failedBuilds: 20 }),
      flakyTest({ filePath: 'mid.spec.ts', failedBuilds: 10 }),
    ]);
    const summary = await reportFlakySuitesToGithub(options(github, { report, maxNewIssues: 2 }));

    expect(github.createIssue.mock.calls.map(([title]: [string]) => title)).toEqual([
      'Flaky Scout test suite: high.spec.ts',
      'Flaky Scout test suite: mid.spec.ts',
    ]);
    expect(summary.actions[2]).toEqual({
      action: 'skipped',
      filePath: 'low.spec.ts',
      reason: 'max-new-issues',
    });
    expect(summary.suites).toBe(3);
  });

  it('does not count suites with an existing issue against the cap', async () => {
    const tracked = flakyTest({ filePath: 'tracked.spec.ts', failedBuilds: 30 });
    const github = createGithubApi([githubIssue({ number: 42, body: suiteIssueBody([tracked]) })]);
    const report = flakyReport([tracked, flakyTest({ filePath: 'new.spec.ts', failedBuilds: 5 })]);
    const summary = await reportFlakySuitesToGithub(options(github, { report, maxNewIssues: 1 }));

    expect(github.createIssue).toHaveBeenCalledTimes(1);
    expect(summary.counts).toEqual({ created: 1, existing: 1, skipped: 0 });
  });

  it('records the dry-run flag in the summary', async () => {
    const summary = await reportFlakySuitesToGithub(options(createGithubApi(), { dryRun: true }));
    expect(summary.dryRun).toBe(true);
  });
});
