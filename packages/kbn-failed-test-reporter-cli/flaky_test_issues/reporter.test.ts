/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import type {
  GithubApi,
  GithubIssue,
  GithubIssueComment,
  ListIssuesOptions,
} from '../failed_tests_reporter/github_api';
import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { readFlakySuiteIssueMetadata, renderFlakySuiteIssueBody } from './issue_body';
import { readFlakySuiteCommentMetadata } from './issue_comment';
import {
  failedBuildsSince,
  issueLabels,
  reportFlakySuiteIssues,
  type ReportFlakySuiteIssuesOptions,
} from './reporter';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, GENERATED_AT, githubIssue, SUITE_PATH } from './test_fixtures';

const log = new ToolingLog();
const CLOSED_SINCE = new Date('2025-09-09T09:04:41.000Z');

/** A fake API serving the listings from one set of issues and their comments. */
const createGithubApi = (
  issues: GithubIssue[] = [],
  comments: Record<number, GithubIssueComment[]> = {}
) => {
  const api = {
    getRequestCount: jest.fn(() => 0),
    listIssues: jest.fn(async ({ state }: ListIssuesOptions) =>
      issues.filter((issue) => state === 'all' || issue.state === state)
    ),
    getIssueComments: jest.fn(async (number: number) => comments[number] ?? []),
    createIssue: jest.fn(async (title: string, body: string, _labels?: string[]) => ({
      number: 900,
      html_url: 'https://github.com/elastic/kibana/issues/900',
      node_id: 'n900',
      title,
      body,
    })),
    addIssueComment: jest.fn(async (_number: number, _body: string) => {}),
    editIssueBodyAndEnsureOpen: jest.fn(async (_number: number, _body: string) => {}),
    reopenIssue: jest.fn(async (_number: number) => {}),
    addLabels: jest.fn(async (_number: number, _labels: string[]) => {}),
  };
  return api as typeof api & GithubApi;
};

const run = (
  github: ReturnType<typeof createGithubApi>,
  overrides: Partial<ReportFlakySuiteIssuesOptions> & Pick<ReportFlakySuiteIssuesOptions, 'report'>
) =>
  reportFlakySuiteIssues({
    github,
    log,
    githubRepo: 'elastic/appex-qa-ai',
    closedSince: CLOSED_SINCE,
    maxNewIssues: 10,
    minCommentIntervalDays: 3,
    dryRun: false,
    moduleLabel: () => 'Synthetics',
    ...overrides,
  });

/** A suite issue as this reporter files it, from an older report. */
const suiteIssue = (
  number: number,
  overrides: Partial<GithubIssue> = {},
  reportedAt = new Date('2026-09-01T09:00:00.000Z')
) => {
  const report = flakyReport([flakyTest({ builds: 400, failedBuilds: 30 })]);
  const [suite] = groupIntoSuites(report.flaky);
  return githubIssue({
    number,
    title: '[Synthetics] Flaky Scout test suite: Default status alert',
    body: renderFlakySuiteIssueBody(suite, { report: { ...report, generatedAt: reportedAt } }),
    ...overrides,
  });
};

const scoutTestIssue = (number: number, testId: string, overrides: Partial<GithubIssue> = {}) =>
  githubIssue({
    number,
    title: `Failing test: Suite - test ${testId}`,
    body: updateIssueMetadata(`| Test ID | ${testId} |\n| Location | ${SUITE_PATH} |`, {
      'test.class': 'Suite',
      'test.name': `test ${testId}`,
      'test.type': 'scout',
    }),
    ...overrides,
  });

/** The report entry the per-test issues are about. */
const trackedTest = (overrides: Parameters<typeof flakyTest>[0] = {}) =>
  flakyTest({ testId: 'pw-1', ...overrides });

const botComment = (generatedAt: string): GithubIssueComment => ({
  body: updateIssueMetadata(
    'Still flaky',
    { 'report.generatedAt': generatedAt, 'report.builds': 300, 'report.failedBuilds': 20 },
    'flaky-test-suite'
  ),
  created_at: generatedAt,
});

describe('reportFlakySuiteIssues', () => {
  it('lists every open failed-test issue and the closed ones updated since the horizon', async () => {
    const github = createGithubApi([
      githubIssue({ number: 1, state: 'open' }),
      githubIssue({ number: 2, state: 'closed' }),
    ]);

    const summary = await run(github, { report: flakyReport([]) });

    expect(github.listIssues).toHaveBeenNthCalledWith(1, {
      state: 'open',
      labels: ['failed-test'],
    });
    expect(github.listIssues).toHaveBeenNthCalledWith(2, {
      state: 'closed',
      labels: ['failed-test'],
      since: CLOSED_SINCE,
      sort: 'updated',
      direction: 'asc',
    });
    expect(summary).toEqual({
      generatedAt: GENERATED_AT,
      dryRun: false,
      githubRepo: 'elastic/appex-qa-ai',
      suites: 0,
      issues: { open: 1, closed: 1, closedSince: CLOSED_SINCE },
      counts: { created: 0, commented: 0, reopened: 0, skipped: 0, failed: 0 },
      actions: [],
    });
  });

  describe('suites without an issue', () => {
    it('creates a suite issue, linking issues that only mention the file', async () => {
      const related = githubIssue({
        number: 7,
        title: 'Failing test: other - test',
        body: `| Location | ${SUITE_PATH} |`,
      });
      const github = createGithubApi([related]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.createIssue).toHaveBeenCalledTimes(1);
      const [title, body, labels] = github.createIssue.mock.calls[0];
      expect(title).toBe('[Synthetics] Flaky Scout test suite: Default status alert');
      expect(body).toContain('Possibly related: #7.');
      expect(readFlakySuiteIssueMetadata(body)?.['suite.filePath']).toBe(SUITE_PATH);
      expect(labels).toEqual(['failed-test']);
      expect(summary.counts.created).toBe(1);
      expect(summary.actions).toEqual([
        {
          action: 'created',
          filePath: SUITE_PATH,
          issue: {
            number: 900,
            url: 'https://github.com/elastic/kibana/issues/900',
            title,
            state: 'open',
          },
        },
      ]);
    });

    it('creates at most --max-new-issues, worst suites first, and skips the rest', async () => {
      const github = createGithubApi();
      const report = flakyReport([
        flakyTest({ testId: 'low', filePath: 'low.spec.ts', failedBuilds: 2 }),
        flakyTest({ testId: 'high', filePath: 'high.spec.ts', failedBuilds: 40 }),
        flakyTest({ testId: 'mid', filePath: 'mid.spec.ts', failedBuilds: 10 }),
      ]);

      const summary = await run(github, { report, maxNewIssues: 2 });

      expect(github.createIssue).toHaveBeenCalledTimes(2);
      expect(summary.actions.map(({ action, filePath }) => [action, filePath])).toEqual([
        ['created', 'high.spec.ts'],
        ['created', 'mid.spec.ts'],
        ['skipped', 'low.spec.ts'],
      ]);
      expect(summary.actions[2]).toMatchObject({ reason: 'max-new-issues' });
    });

    it('records a failed creation and carries on with the next suite', async () => {
      const github = createGithubApi();
      github.createIssue.mockRejectedValueOnce(new Error('422 Validation Failed'));
      const report = flakyReport([
        flakyTest({ testId: 'a', filePath: 'a.spec.ts', failedBuilds: 40 }),
        flakyTest({ testId: 'b', filePath: 'b.spec.ts', failedBuilds: 10 }),
      ]);

      const summary = await run(github, { report });

      expect(summary.counts).toMatchObject({ created: 1, failed: 1 });
      expect(summary.actions[0]).toEqual({
        action: 'failed',
        filePath: 'a.spec.ts',
        attempted: 'create',
        error: '422 Validation Failed',
      });
    });
  });

  describe('suites with an open issue', () => {
    it('comments on a suite issue and bumps its metadata', async () => {
      const issue = suiteIssue(42);
      const github = createGithubApi([issue]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.createIssue).not.toHaveBeenCalled();
      expect(github.getIssueComments).toHaveBeenCalledWith(42, { readInDryRun: true });
      expect(github.editIssueBodyAndEnsureOpen).toHaveBeenCalledTimes(1);
      const [, newBody] = github.editIssueBodyAndEnsureOpen.mock.calls[0];
      expect(readFlakySuiteIssueMetadata(newBody)).toMatchObject({
        'report.count': 2,
        'report.generatedAt': GENERATED_AT.toISOString(),
      });
      expect(github.addIssueComment).toHaveBeenCalledTimes(1);
      const [, comment] = github.addIssueComment.mock.calls[0];
      expect(comment).toContain('Still flaky: **49 / 509 builds (10%)**');
      // the previous numbers come from the issue's own history
      expect(comment).toContain('Previous report (1 Sep): 30 / 400 (8%).');
      expect(readFlakySuiteCommentMetadata(comment)?.failedBuilds).toBe(49);
      expect(summary.actions).toEqual([
        {
          action: 'commented',
          filePath: SUITE_PATH,
          issue: { number: 42, url: issue.html_url, title: issue.title, state: 'open' },
          match: 'suite',
        },
      ]);
    });

    it('comments on a per-test issue without creating a suite issue or editing its body', async () => {
      const github = createGithubApi([scoutTestIssue(43, 'pw-1')]);

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expect(github.createIssue).not.toHaveBeenCalled();
      expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
      expect(github.addIssueComment).toHaveBeenCalledWith(
        43,
        expect.stringContaining("This test is in today's flaky test report for its suite")
      );
      expect(summary.actions[0]).toMatchObject({ action: 'commented', match: 'test' });
    });

    it('comments on the strongest open match only and names the others', async () => {
      const github = createGithubApi([
        suiteIssue(42, { state: 'closed', closed_at: '2026-09-08T00:00:00.000Z' }),
        scoutTestIssue(43, 'pw-1'),
      ]);

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expect(github.addIssueComment).toHaveBeenCalledTimes(1);
      const [number, comment] = github.addIssueComment.mock.calls[0];
      expect(number).toBe(43);
      expect(comment).toContain('Also tracked by #42 (suite issue).');
      expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
      expect(summary.counts).toMatchObject({ commented: 1, reopened: 0 });
    });

    it('skips an issue that got a report comment within the interval', async () => {
      const github = createGithubApi(
        [scoutTestIssue(43, 'pw-1')],
        { 43: [botComment('2026-09-07T09:00:00.000Z')] }
      );

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expect(github.addIssueComment).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({
        action: 'skipped',
        reason: 'recently-commented',
        issue: { number: 43 },
      });
    });

    it('uses the last report comment as the previous numbers once the interval has passed', async () => {
      const github = createGithubApi(
        [scoutTestIssue(43, 'pw-1')],
        { 43: [botComment('2026-09-05T09:00:00.000Z'), { body: 'New failure: build 1' }] }
      );

      await run(github, { report: flakyReport([trackedTest()]) });

      const [, comment] = github.addIssueComment.mock.calls[0];
      expect(comment).toContain('Previous report (5 Sep): 20 / 300 (7%).');
    });

    it('treats the filing of a suite issue as a report for the cadence', async () => {
      const github = createGithubApi([suiteIssue(42, {}, new Date('2026-09-08T09:00:00.000Z'))]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(summary.actions[0]).toMatchObject({ action: 'skipped', reason: 'recently-commented' });
    });

    it('skips an issue labelled skipped-test', async () => {
      const github = createGithubApi([suiteIssue(42, { labels: [{ name: 'skipped-test' }] })]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.getIssueComments).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({ action: 'skipped', reason: 'skipped-test' });
    });

    it('records a failed comment and carries on', async () => {
      const github = createGithubApi([suiteIssue(42)]);
      github.addIssueComment.mockRejectedValueOnce(new Error('503'));

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(summary.actions[0]).toMatchObject({
        action: 'failed',
        attempted: 'comment',
        error: '503',
        issue: { number: 42 },
      });
    });
  });

  describe('suites with a closed issue', () => {
    // the fixture trend fails 9, 7, 4 and 2 builds on 6, 7, 8 and 9 Sep
    it('reopens a suite issue that failed at least twice since it was closed, with a comment', async () => {
      const issue = suiteIssue(42, { state: 'closed', closed_at: '2026-09-06T12:00:00.000Z' });
      const github = createGithubApi([issue]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.editIssueBodyAndEnsureOpen).toHaveBeenCalledTimes(1);
      expect(github.reopenIssue).not.toHaveBeenCalled();
      const [, comment] = github.addIssueComment.mock.calls[0];
      expect(comment).toContain(
        'Reopened: still flaky after 13 failed builds since it was closed on 6 Sep.'
      );
      expect(summary.actions).toEqual([
        {
          action: 'reopened',
          filePath: SUITE_PATH,
          issue: { number: 42, url: issue.html_url, title: issue.title, state: 'open' },
          match: 'suite',
        },
      ]);
    });

    it('reopens a per-test issue without touching its body', async () => {
      const github = createGithubApi([
        scoutTestIssue(43, 'pw-1', {
          state: 'closed',
          closed_at: '2026-09-06T12:00:00.000Z',
        }),
      ]);

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expect(github.reopenIssue).toHaveBeenCalledWith(43);
      expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({ action: 'reopened', match: 'test' });
    });

    it('leaves an issue closed when fewer than two builds failed since', async () => {
      const github = createGithubApi([
        suiteIssue(42, { state: 'closed', closed_at: '2026-09-09T01:00:00.000Z' }),
      ]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
      expect(github.addIssueComment).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({
        action: 'skipped',
        reason: 'closed-before-failures',
      });
    });

    it('falls back to the last failure when the report has no trend', async () => {
      const github = createGithubApi([
        suiteIssue(42, { state: 'closed', closed_at: '2026-09-09T08:00:00.000Z' }),
      ]);

      // last failed at 06:12 on 9 Sep, before the closing
      const stale = await run(github, { report: flakyReport([flakyTest({ trend: undefined })]) });
      expect(stale.actions[0]).toMatchObject({ action: 'skipped', reason: 'closed-before-failures' });

      const fresh = await run(createGithubApi([
        suiteIssue(42, { state: 'closed', closed_at: '2026-09-09T06:00:00.000Z' }),
      ]), { report: flakyReport([flakyTest({ trend: undefined })]) });
      expect(fresh.actions[0]).toMatchObject({ action: 'reopened' });
    });

    it('records a failed reopen and carries on', async () => {
      const github = createGithubApi([
        suiteIssue(42, { state: 'closed', closed_at: '2026-09-06T12:00:00.000Z' }),
      ]);
      github.editIssueBodyAndEnsureOpen.mockRejectedValueOnce(new Error('403'));

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expect(github.addIssueComment).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({ action: 'failed', attempted: 'reopen', error: '403' });
    });
  });

  it('reports would-be actions in a dry run', async () => {
    const github = createGithubApi([suiteIssue(42)]);

    const summary = await run(github, {
      report: flakyReport([flakyTest(), flakyTest({ testId: 'n', filePath: 'new.spec.ts' })]),
      dryRun: true,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.counts).toMatchObject({ created: 1, commented: 1 });
  });
});

describe('issueLabels', () => {
  const report = flakyReport([flakyTest({ owners: ['elastic/kibana-core', 'elastic/nobody'] })]);
  const [suite] = groupIntoSuites(report.flaky);

  it('adds the owning teams labels in the Kibana repository only', () => {
    expect(issueLabels(suite, 'elastic/kibana')).toEqual(['failed-test', 'Team:Core']);
    expect(issueLabels(suite, 'elastic/appex-qa-ai')).toEqual(['failed-test']);
  });
});

describe('failedBuildsSince', () => {
  const trend = {
    days: 4,
    from: new Date('2026-09-01T00:00:00.000Z'),
    buildsPerDay: [10, 10, 10, 10],
    failedBuildsPerDay: [5, 1, 2, 3],
  };
  const report = flakyReport([
    flakyTest({ testId: 'a', trend }),
    flakyTest({ testId: 'b', trend: { ...trend, failedBuildsPerDay: [0, 4, 0, 1] } }),
  ]);
  const [suite] = groupIntoSuites(report.flaky);

  it('sums the worst test per day over the days fully after the closing', () => {
    // 2 Sep: max(1, 4) = 4; 3 Sep: 2; 4 Sep: 3
    expect(failedBuildsSince(suite, new Date('2026-09-01T12:00:00.000Z'))).toBe(9);
    expect(failedBuildsSince(suite, new Date('2026-09-02T00:00:00.000Z'))).toBe(9);
    expect(failedBuildsSince(suite, new Date('2026-09-04T00:00:00.001Z'))).toBe(0);
  });

  it('is undefined without any trend', () => {
    const [noTrend] = groupIntoSuites([flakyTest({ trend: undefined })]);
    expect(failedBuildsSince(noTrend, new Date('2026-09-01T00:00:00.000Z'))).toBeUndefined();
  });
});
