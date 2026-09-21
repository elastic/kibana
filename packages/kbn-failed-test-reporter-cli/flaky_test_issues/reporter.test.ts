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
  ListIssuesOptions,
} from '../failed_tests_reporter/github_api';
import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import { readFlakySuiteIssueMetadata, renderFlakySuiteIssueBody } from './issue_body';
import {
  issueLabels,
  reportFlakySuiteIssues,
  type ReportFlakySuiteIssuesOptions,
} from './reporter';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, GENERATED_AT, githubIssue, SUITE_PATH } from './test_fixtures';

const log = new ToolingLog();
const CLOSED_SINCE = new Date('2025-09-09T09:04:41.000Z');
const TARGET_REPO = 'elastic/appex-qa-ai';
const TRACKING_REPO = 'elastic/kibana';

/** A fake API serving the listings from one set of issues. */
const createGithubApi = (issues: GithubIssue[] = []) => {
  const api = {
    getRequestCount: jest.fn(() => 0),
    listIssues: jest.fn(async ({ state }: ListIssuesOptions) =>
      issues.filter((issue) => state === 'all' || issue.state === state)
    ),
    createIssue: jest.fn(async (title: string, body: string, _labels?: string[]) => ({
      number: 900,
      html_url: 'https://github.com/elastic/kibana/issues/900',
      node_id: 'n900',
      title,
      body,
    })),
    addIssueComment: jest.fn(async (_number: number, _body: string) => {}),
    editIssueBodyAndEnsureOpen: jest.fn(async (_number: number, _body: string) => {}),
  };
  return api as typeof api & GithubApi;
};

/** The tracking repository's client, serving its own issues; it must never be written to. */
const trackingRepo = (issues: GithubIssue[] = []) => ({
  github: createGithubApi(issues),
  repo: TRACKING_REPO,
});

const run = (
  github: ReturnType<typeof createGithubApi>,
  overrides: Partial<ReportFlakySuiteIssuesOptions> & Pick<ReportFlakySuiteIssuesOptions, 'report'>
) =>
  reportFlakySuiteIssues({
    github,
    log,
    githubRepo: TARGET_REPO,
    closedSince: CLOSED_SINCE,
    maxNewIssues: 10,
    dryRun: false,
    moduleLabel: () => 'Synthetics',
    ...overrides,
  });

/** A suite issue as this reporter files it, from an older report. */
const suiteIssue = (number: number, overrides: Partial<GithubIssue> = {}) => {
  const report = flakyReport([flakyTest({ builds: 400, failedBuilds: 30 })]);
  const [suite] = groupIntoSuites(report.flaky);
  return githubIssue({
    number,
    title: '[Synthetics] Flaky Scout test suite: Default status alert',
    body: renderFlakySuiteIssueBody(suite, {
      report: { ...report, generatedAt: new Date('2026-09-01T09:00:00.000Z') },
    }),
    ...overrides,
  });
};

/** A per-test issue as `report_failed_tests` files it for a Scout test of the suite. */
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

/** An issue about another test that happens to name the suite's file. */
const fileMention = (number: number) =>
  githubIssue({
    number,
    title: 'Failing test: other - test',
    body: `| Location | ${SUITE_PATH} |`,
  });

/** The report entry the per-test issues are about. */
const trackedTest = (overrides: Parameters<typeof flakyTest>[0] = {}) =>
  flakyTest({ testId: 'pw-1', ...overrides });

const expectNoWrites = (github: ReturnType<typeof createGithubApi>) => {
  expect(github.createIssue).not.toHaveBeenCalled();
  expect(github.addIssueComment).not.toHaveBeenCalled();
  expect(github.editIssueBodyAndEnsureOpen).not.toHaveBeenCalled();
};

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
      githubRepo: TARGET_REPO,
      suites: 0,
      issues: { open: 1, closed: 1, closedSince: CLOSED_SINCE },
      counts: { created: 0, skipped: 0, failed: 0 },
      actions: [],
    });
  });

  describe('suites without an issue', () => {
    it('creates a suite issue, linking issues that only mention the file', async () => {
      const github = createGithubApi([fileMention(7)]);

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

  describe('suites with an issue in the target repository', () => {
    it('skips a suite that has an open suite issue', async () => {
      const issue = suiteIssue(42);
      const github = createGithubApi([issue]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expectNoWrites(github);
      expect(summary.actions).toEqual([
        {
          action: 'skipped',
          filePath: SUITE_PATH,
          reason: 'tracked',
          issue: { number: 42, url: issue.html_url, title: issue.title, state: 'open' },
          match: 'suite',
        },
      ]);
    });

    it('skips a suite whose suite issue is closed rather than filing a second one', async () => {
      const github = createGithubApi([suiteIssue(42, { state: 'closed' })]);

      const summary = await run(github, { report: flakyReport([flakyTest()]) });

      expectNoWrites(github);
      expect(summary.actions[0]).toMatchObject({
        action: 'skipped',
        reason: 'tracked',
        issue: { number: 42, state: 'closed' },
        match: 'suite',
      });
    });

    it('skips a suite one of whose tests has a per-test issue', async () => {
      const github = createGithubApi([scoutTestIssue(43, 'pw-1')]);

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expectNoWrites(github);
      expect(summary.actions[0]).toMatchObject({
        action: 'skipped',
        reason: 'tracked',
        issue: { number: 43 },
        match: 'test',
      });
    });

    it('records the strongest open match over a stronger closed one', async () => {
      const github = createGithubApi([
        suiteIssue(42, { state: 'closed' }),
        scoutTestIssue(43, 'pw-1'),
      ]);

      const summary = await run(github, { report: flakyReport([trackedTest()]) });

      expect(summary.actions[0]).toMatchObject({
        reason: 'tracked',
        issue: { number: 43, state: 'open' },
        match: 'test',
      });
    });
  });

  describe('suites tracked in the tracking repository', () => {
    it('does not file an issue for a suite one of whose tests has an open issue there', async () => {
      const github = createGithubApi();
      const tracking = trackingRepo([scoutTestIssue(123, 'pw-1')]);

      const summary = await run(github, { report: flakyReport([trackedTest()]), tracking });

      expectNoWrites(github);
      expectNoWrites(tracking.github);
      expect(summary.actions).toEqual([
        {
          action: 'skipped',
          filePath: SUITE_PATH,
          reason: 'tracked-upstream',
          issue: {
            number: 123,
            url: 'https://github.com/elastic/kibana/issues/123',
            title: 'Failing test: Suite - test pw-1',
            state: 'open',
            repo: TRACKING_REPO,
          },
          match: 'test',
        },
      ]);
    });

    it('nor when that issue is closed', async () => {
      const github = createGithubApi();
      const tracking = trackingRepo([scoutTestIssue(123, 'pw-1', { state: 'closed' })]);

      const summary = await run(github, { report: flakyReport([trackedTest()]), tracking });

      expect(github.createIssue).not.toHaveBeenCalled();
      expect(summary.actions[0]).toMatchObject({
        reason: 'tracked-upstream',
        issue: { number: 123, state: 'closed', repo: TRACKING_REPO },
      });
    });

    it('files the issue when the tracking repository only mentions the file, without linking it', async () => {
      const github = createGithubApi();
      const tracking = trackingRepo([fileMention(7)]);

      const summary = await run(github, { report: flakyReport([flakyTest()]), tracking });

      expect(summary.actions[0]).toMatchObject({ action: 'created' });
      const [, body] = github.createIssue.mock.calls[0];
      // `#7` would point at the wrong issue in the target repository
      expect(body).not.toContain('Possibly related');
    });

    it('does not spend a creation slot on a suite tracked there', async () => {
      const github = createGithubApi();
      const tracking = trackingRepo([scoutTestIssue(123, 'pw-1')]);
      const report = flakyReport([
        trackedTest({ failedBuilds: 49 }),
        flakyTest({ testId: 'other', filePath: 'other.spec.ts', failedBuilds: 10 }),
      ]);

      const summary = await run(github, { report, tracking, maxNewIssues: 1 });

      expect(summary.actions.map(({ action, filePath }) => [action, filePath])).toEqual([
        ['skipped', SUITE_PATH],
        ['created', 'other.spec.ts'],
      ]);
    });

    it('reports a suite tracked in both repositories by its issue in the target one', async () => {
      const github = createGithubApi([suiteIssue(42)]);
      const tracking = trackingRepo([scoutTestIssue(123, 'pw-1')]);

      const summary = await run(github, { report: flakyReport([trackedTest()]), tracking });

      expect(summary.actions[0]).toMatchObject({ reason: 'tracked', issue: { number: 42 } });
    });

    it('lists the tracking repository with the same horizon and counts its issues', async () => {
      const github = createGithubApi();
      const tracking = trackingRepo([
        scoutTestIssue(123, 'pw-1'),
        githubIssue({ number: 124, state: 'closed' }),
        githubIssue({ number: 125, state: 'closed' }),
      ]);

      const summary = await run(github, { report: flakyReport([]), tracking });

      expect(tracking.github.listIssues).toHaveBeenCalledTimes(2);
      expect(tracking.github.listIssues).toHaveBeenNthCalledWith(2, {
        state: 'closed',
        labels: ['failed-test'],
        since: CLOSED_SINCE,
        sort: 'updated',
        direction: 'asc',
      });
      expect(summary.issues).toEqual({
        open: 0,
        closed: 0,
        closedSince: CLOSED_SINCE,
        tracking: { repo: TRACKING_REPO, open: 1, closed: 2 },
      });
    });
  });

  it('reports would-be actions in a dry run', async () => {
    const github = createGithubApi([suiteIssue(42)]);

    const summary = await run(github, {
      report: flakyReport([flakyTest(), flakyTest({ testId: 'n', filePath: 'new.spec.ts' })]),
      dryRun: true,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.counts).toEqual({ created: 1, skipped: 1, failed: 0 });
  });
});

describe('issueLabels', () => {
  const report = flakyReport([flakyTest({ owners: ['elastic/kibana-core', 'elastic/nobody'] })]);
  const [suite] = groupIntoSuites(report.flaky);

  it('adds the owning teams labels in the Kibana repository only', () => {
    expect(issueLabels(suite, 'elastic/kibana')).toEqual(['failed-test', 'Team:Core']);
    expect(issueLabels(suite, TARGET_REPO)).toEqual(['failed-test']);
  });
});
