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
import { readReportCount, readReportHistory, renderFlakySuiteIssueBody } from './issue_body';
import {
  FAILED_TEST_LABEL,
  indexSuiteIssues,
  relatedFailedTestIssues,
  reportFlakySuitesToGithub,
  suiteIssuesQuery,
  type ReportFlakySuitesOptions,
} from './reporter';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, githubIssue, SUITE_PATH } from './test_fixtures';

jest.mock('../failed_tests_reporter/github_api');
const { GithubApi } = jest.requireMock('../failed_tests_reporter/github_api');

const log = new ToolingLog();

const createGithubApi = (issues: { suite?: GithubIssue[]; failedTest?: GithubIssue[] } = {}) => {
  const api = new GithubApi();
  api.searchIssues.mockResolvedValue(issues.suite ?? []);
  api.listIssues.mockResolvedValue(issues.failedTest ?? []);
  api.createIssue.mockImplementation(async (title: string) => ({
    number: 900,
    html_url: 'https://github.com/elastic/kibana/issues/900',
    node_id: 'new',
    body: title,
  }));
  return api;
};

/** A body as written by an earlier run, so metadata lookups find the suite. */
const suiteIssueBody = (tests = [flakyTest()], reportCount = 1) =>
  renderFlakySuiteIssueBody(groupIntoSuites(tests)[0], {
    report: flakyReport(tests),
    relatedIssues: [],
    reportCount,
    history: [],
  });

const options = (
  github: ReturnType<typeof createGithubApi>,
  overrides: Partial<ReportFlakySuitesOptions> = {}
): ReportFlakySuitesOptions => ({
  report: flakyReport([flakyTest()]),
  github,
  log,
  labels: [FAILED_TEST_LABEL],
  maxNewIssues: 10,
  failedTestIssuePolicy: 'skip',
  dryRun: false,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('indexSuiteIssues', () => {
  it('prefers an open issue over closed ones and the newest among equals', () => {
    const body = suiteIssueBody();
    const index = indexSuiteIssues([
      githubIssue({ number: 1, body, state: 'closed' }),
      githubIssue({ number: 3, body, state: 'closed' }),
      githubIssue({ number: 2, body, state: 'open' }),
      githubIssue({ number: 4, body: 'not ours' }),
    ]);

    expect([...index.keys()]).toEqual([SUITE_PATH]);
    expect(index.get(SUITE_PATH)?.number).toBe(2);
  });

  it('falls back to the most recent closed issue', () => {
    const body = suiteIssueBody();
    const index = indexSuiteIssues([
      githubIssue({ number: 1, body, state: 'closed' }),
      githubIssue({ number: 3, body, state: 'closed' }),
    ]);
    expect(index.get(SUITE_PATH)?.number).toBe(3);
  });
});

describe('relatedFailedTestIssues', () => {
  it('matches failed-test issues whose body mentions the suite file, ignoring our own', () => {
    const related = relatedFailedTestIssues({ filePath: 'a/b/c.spec.ts' }, [
      githubIssue({ number: 1, body: '| Location | a/b/c.spec.ts |', title: 'Failing test: c' }),
      githubIssue({ number: 2, body: '| Location | a/b/d.spec.ts |' }),
      githubIssue({ number: 3, body: suiteIssueBody([flakyTest({ filePath: 'a/b/c.spec.ts' })]) }),
    ]);
    expect(related).toEqual([
      {
        number: 1,
        html_url: 'https://github.com/elastic/kibana/issues/1',
        title: 'Failing test: c',
      },
    ]);
  });
});

describe('suiteIssuesQuery', () => {
  it('narrows failed-test issues down by the title prefix', () => {
    expect(suiteIssuesQuery()).toBe('label:failed-test in:title "Flaky test suite"');
  });
});

describe('reportFlakySuitesToGithub', () => {
  it('creates an issue for a new suite', async () => {
    const github = createGithubApi();
    const summary = await reportFlakySuitesToGithub(
      options(github, { reportUrl: 'https://buildkite.com/elastic/p/builds/1' })
    );

    expect(github.searchIssues).toHaveBeenCalledWith({ query: suiteIssuesQuery() });
    expect(github.listIssues).toHaveBeenCalledWith({ labels: [FAILED_TEST_LABEL], state: 'open' });
    expect(github.createIssue).toHaveBeenCalledTimes(1);
    const [title, body, labels] = github.createIssue.mock.calls[0];
    expect(title).toBe(`Flaky test suite: ${SUITE_PATH}`);
    expect(labels).toEqual([FAILED_TEST_LABEL]);
    expect(readReportCount(body)).toBe(1);
    expect(readReportHistory(body)).toEqual([
      { generatedAt: '2026-09-09T09:04:41.000Z', builds: 509, failedBuilds: 49 },
    ]);
    expect(body).toContain('https://buildkite.com/elastic/p/builds/1');
    expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
    expect(summary.counts).toEqual({ created: 1, updated: 0, reopened: 0, skipped: 0 });
    expect(summary.actions).toEqual([
      {
        action: 'created',
        filePath: SUITE_PATH,
        issue: { number: 900, url: 'https://github.com/elastic/kibana/issues/900' },
      },
    ]);
  });

  it('updates the open issue of a known suite in place, bumping the count and history', async () => {
    const earlier = flakyReport([flakyTest()], {
      generatedAt: new Date('2026-09-08T09:00:00.000Z'),
    });
    const existingBody = renderFlakySuiteIssueBody(groupIntoSuites(earlier.flaky)[0], {
      report: earlier,
      relatedIssues: [],
      reportCount: 4,
      history: [{ generatedAt: '2026-09-07T09:00:00.000Z', builds: 500, failedBuilds: 20 }],
    });
    const github = createGithubApi({ suite: [githubIssue({ number: 42, body: existingBody })] });
    const summary = await reportFlakySuitesToGithub(options(github));

    expect(github.createIssue).not.toHaveBeenCalled();
    expect(github.addIssueComment).not.toHaveBeenCalled();
    expect(github.editIssueBodyAndEnsureOpen).toHaveBeenCalledTimes(1);
    const [number, body] = github.editIssueBodyAndEnsureOpen.mock.calls[0];
    expect(number).toBe(42);
    expect(readReportCount(body)).toBe(5);
    expect(readReportHistory(body).map(({ generatedAt }) => generatedAt)).toEqual([
      '2026-09-07T09:00:00.000Z',
      '2026-09-08T09:00:00.000Z',
      '2026-09-09T09:04:41.000Z',
    ]);
    expect(body).toContain(
      'Flagged by **5 reports** so far, fail rate 4.0% → 9.6% → **9.6%** (unchanged).'
    );
    expect(summary.counts.updated).toBe(1);
  });

  it('does not count the same report twice when a run is retried', async () => {
    const github = createGithubApi();
    await reportFlakySuitesToGithub(options(github));
    const [, firstBody] = github.createIssue.mock.calls[0];

    const retry = createGithubApi({ suite: [githubIssue({ number: 42, body: firstBody })] });
    await reportFlakySuitesToGithub(options(retry));
    const [, secondBody] = retry.editIssueBodyAndEnsureOpen.mock.calls[0];

    expect(readReportCount(secondBody)).toBe(1);
    expect(readReportHistory(secondBody)).toHaveLength(1);
    expect(secondBody).not.toContain('Flagged by');
  });

  it('reopens a closed issue with a comment', async () => {
    const existing = githubIssue({ number: 42, body: suiteIssueBody(), state: 'closed' });
    const github = createGithubApi({ suite: [existing] });
    const summary = await reportFlakySuitesToGithub(options(github));

    expect(github.editIssueBodyAndEnsureOpen).toHaveBeenCalledTimes(1);
    expect(github.addIssueComment).toHaveBeenCalledWith(42, expect.stringMatching(/^Flaky again/));
    expect(summary.actions[0]).toMatchObject({ action: 'reopened', issue: { number: 42 } });
  });

  it('updates a known suite even when a failed-test issue also tracks it', async () => {
    const github = createGithubApi({
      suite: [githubIssue({ number: 42, body: suiteIssueBody() })],
      failedTest: [githubIssue({ number: 7, body: `| Location | ${SUITE_PATH} |` })],
    });
    const summary = await reportFlakySuitesToGithub(options(github));

    expect(github.editIssueBodyAndEnsureOpen).toHaveBeenCalledTimes(1);
    expect(github.editIssueBodyAndEnsureOpen.mock.calls[0][1]).toContain('[#7]');
    expect(summary.counts.updated).toBe(1);
  });

  it('skips new suites tracked by a failed-test issue under the skip policy', async () => {
    const github = createGithubApi({
      failedTest: [githubIssue({ number: 7, body: `| Location | ${SUITE_PATH} |` })],
    });
    const summary = await reportFlakySuitesToGithub(options(github));

    expect(github.createIssue).not.toHaveBeenCalled();
    expect(summary.actions).toEqual([
      { action: 'skipped', filePath: SUITE_PATH, reason: 'failed-test-issue', relatedIssues: [7] },
    ]);
  });

  it('creates and links under the link policy', async () => {
    const github = createGithubApi({
      failedTest: [githubIssue({ number: 7, body: `| Location | ${SUITE_PATH} |` })],
    });
    const summary = await reportFlakySuitesToGithub(
      options(github, { failedTestIssuePolicy: 'link' })
    );

    expect(github.createIssue).toHaveBeenCalledTimes(1);
    expect(github.createIssue.mock.calls[0][1]).toContain('**Related `failed-test` issues**');
    expect(summary.counts.created).toBe(1);
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
      'Flaky test suite: high.spec.ts',
      'Flaky test suite: mid.spec.ts',
    ]);
    expect(summary.actions[2]).toEqual({
      action: 'skipped',
      filePath: 'low.spec.ts',
      reason: 'max-new-issues',
    });
    expect(summary.suites).toBe(3);
  });

  it('records the dry-run flag in the summary', async () => {
    const summary = await reportFlakySuitesToGithub(options(createGithubApi(), { dryRun: true }));
    expect(summary.dryRun).toBe(true);
  });
});
