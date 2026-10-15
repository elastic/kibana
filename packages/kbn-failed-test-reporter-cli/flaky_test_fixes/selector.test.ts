/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import {
  hasIssueLabel,
  type GithubIssue,
  type GithubIssueEvent,
} from '../failed_tests_reporter/github_api';
import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  fileWideIssue,
  flakyReport,
  flakyTest,
  githubIssue,
  SUITE_PATH,
} from '../flaky_test_issues/test_fixtures';
import { buildFixGroups } from './groups';
import { FIXABLE_LABEL, FIX_LABEL, requestFlakyTestFixes } from './selector';

type Options = Parameters<typeof requestFlakyTestFixes>[0];
const REPO = 'elastic/kibana';
const LABELS = ['failed-test', FIXABLE_LABEL];

const issue = (number: number, overrides: Partial<GithubIssue> = {}) =>
  fileWideIssue(number, { labels: [...LABELS], ...overrides });

const perTestIssue = (number: number, testId: string, filePath = SUITE_PATH) =>
  githubIssue({
    number,
    labels: [...LABELS],
    body: updateIssueMetadata(`| Location | ${filePath} |\n| Test ID | ${testId} |`, {
      'test.name': testId,
      'test.type': 'scout',
    }),
  });

const event = (id: number, overrides: Partial<GithubIssueEvent> = {}): GithubIssueEvent => ({
  id,
  event: 'labeled',
  created_at: `2026-09-${String(id).padStart(2, '0')}T12:00:00Z`,
  label: { name: FIX_LABEL },
  ...overrides,
});

const linkedPr = (id: number, number = 99) =>
  event(id, {
    event: 'cross-referenced',
    source: {
      issue: {
        html_url: `https://github.com/${REPO}/pull/${number}`,
        pull_request: { url: 'api' },
      },
    },
  });

const setup = (initialIssues: GithubIssue[]) => {
  const issues = new Map(initialIssues.map((item) => [item.number, structuredClone(item)]));
  const histories = new Map<number, GithubIssueEvent[]>();
  let nextId = 1000;
  const github: jest.Mocked<Options['github']> = {
    getAuthenticatedLogin: jest.fn(async () => 'kibanamachine'),
    listIssues: jest.fn(async ({ labels = [] }) =>
      [...issues.values()].filter((item) => labels.every((label) => hasIssueLabel(item, label)))
    ),
    getIssue: jest.fn(async (number) => {
      const found = issues.get(number);
      if (!found) throw new Error(`Missing issue #${number}`);
      return structuredClone(found);
    }),
    getIssueTimeline: jest.fn(async (number) => [...(histories.get(number) ?? [])]),
    getFixPullRequest: jest
      .fn<ReturnType<Options['github']['getFixPullRequest']>, [number]>()
      .mockResolvedValue({ state: 'CLOSED', mergedAt: null, closingIssues: [] }),
    checkLabel: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    addLabelsOnce: jest.fn(async (number, labels) => {
      const found = issues.get(number);
      if (!found) throw new Error(`Missing issue #${number}`);
      for (const label of labels) {
        if (!hasIssueLabel(found, label)) {
          found.labels.push(label);
          histories.set(number, [
            ...(histories.get(number) ?? []),
            event(nextId++, { label: { name: label }, created_at: '2026-09-15T12:00:00Z' }),
          ]);
        }
      }
    }),
  };
  const run = (overrides: Partial<Options> = {}) =>
    requestFlakyTestFixes({
      github,
      repo: REPO,
      report: flakyReport([flakyTest()]),
      dryRun: false,
      maxRequests: 5,
      buildUrl: 'https://buildkite.com/elastic/kibana-report-flaky-tests/builds/32',
      fileExists: () => true,
      log: new ToolingLog(),
      ...overrides,
    });
  const triggerWrites = () =>
    github.addLabelsOnce.mock.calls.filter(([, labels]) => labels.includes(FIX_LABEL));
  return { github, histories, issues, run, triggerWrites };
};

describe('file-level association', () => {
  it('includes sibling cases absent from the report, but targets only affected cases', () => {
    const test = flakyTest({ testId: 'reported' });
    const [group] = buildFixGroups(flakyReport([test]), [
      perTestIssue(1, 'reported'),
      perTestIssue(2, 'below-threshold'),
    ]);
    expect(group.siblings.map(({ number }) => number)).toEqual([1, 2]);
    expect(group.targets.map(({ number }) => number)).toEqual([1]);
  });

  it('does not promote arbitrary mentions or another framework into the group', () => {
    const [group] = buildFixGroups(flakyReport([flakyTest()]), [
      githubIssue({ number: 1, body: `A stack frame mentions ${SUITE_PATH}` }),
      fileWideIssue(2, { framework: 'jest', labels: LABELS }),
      issue(3),
    ]);
    expect(group.targets.map(({ number }) => number)).toEqual([3]);
    expect(group.ambiguous).toEqual([]);
  });

  it('holds directory-only Jest identity rather than guessing a file', () => {
    const path = 'src/a/client.test.ts';
    const [group] = buildFixGroups(
      flakyReport([flakyTest({ filePath: path, framework: 'jest' })]),
      [
        githubIssue({
          number: 1,
          body: updateIssueMetadata('failure', {
            'test.class': 'Jest Tests.src/a',
            'test.name': 'another test',
          }),
        }),
      ]
    );
    expect(group.ambiguous).toEqual([1]);
  });
});

describe('automatic requests', () => {
  it('requests once for multiple cases and nested describes, choosing a stable oldest target', async () => {
    const { run, triggerWrites, github } = setup([issue(2), issue(1)]);
    const summary = await run({
      report: flakyReport([
        flakyTest({ suiteTitle: 'A', testId: 'a' }),
        flakyTest({ suiteTitle: 'A B', testId: 'b' }),
      ]),
    });
    expect(summary.actions).toEqual([
      expect.objectContaining({ action: 'requested', issue: 1, siblings: [2, 1] }),
    ]);
    expect(triggerWrites()).toEqual([[1, [FIX_LABEL]]]);
    expect(github.addLabelsOnce).toHaveBeenCalledTimes(1);
    expect(github.listIssues).toHaveBeenCalledTimes(1);
    expect(github.listIssues).toHaveBeenCalledWith({ state: 'all', labels: ['failed-test'] });
  });

  it('does not request again after consumption, a no-PR result or a new sibling', async () => {
    const { run, issues, triggerWrites } = setup([issue(1)]);
    await run();
    const representative = issues.get(1);
    if (!representative) throw new Error('Missing representative');
    representative.labels = representative.labels.filter((label) => label !== FIX_LABEL);
    issues.set(2, issue(2));
    const summary = await run({
      report: flakyReport([flakyTest({ testId: 'new-test', suiteTitle: 'new describe' })]),
    });
    expect(summary.actions[0].reason).toBe('already-requested');
    expect(triggerWrites()).toHaveLength(1);
  });

  it('requires the selected issue itself to be fixable', async () => {
    const { run, triggerWrites } = setup([
      perTestIssue(1, 'not-reported'),
      { ...perTestIssue(2, 'reported'), labels: ['failed-test'] },
    ]);
    const summary = await run({ report: flakyReport([flakyTest({ testId: 'reported' })]) });
    expect(summary.actions[0].reason).toBe('awaiting-investigation');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('holds in-flight requests on siblings outside the admitted report', async () => {
    const { run, triggerWrites } = setup([
      perTestIssue(1, 'reported'),
      { ...perTestIssue(2, 'not-reported'), labels: ['failed-test', FIX_LABEL] },
    ]);
    const summary = await run({ report: flakyReport([flakyTest({ testId: 'reported' })]) });
    expect(summary.actions[0].reason).toBe('request-in-flight');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('reads historical closed siblings without adding bookkeeping', async () => {
    const { run, histories, triggerWrites, github } = setup([
      issue(1, { state: 'closed' }),
      issue(2),
    ]);
    histories.set(1, [event(1)]);
    expect((await run()).actions[0]).toMatchObject({ reason: 'already-requested', issue: 1 });
    expect(triggerWrites()).toHaveLength(0);
    expect(github.addLabelsOnce).not.toHaveBeenCalled();
    expect(github.listIssues).toHaveBeenCalledWith({ state: 'all', labels: ['failed-test'] });
  });

  it('recognizes direct manual dispatch through trusted fixer comments', async () => {
    const { run, histories, triggerWrites } = setup([issue(1)]);
    histories.set(1, [
      event(1, {
        event: 'commented',
        user: { login: 'github-actions[bot]' },
        body: '<!-- gh-aw-agentic-workflow: Flaky Test Fixer, id: 123 -->',
      }),
    ]);
    expect((await run()).actions[0].reason).toBe('already-requested');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('does not rotate a closed representative to an eligible sibling', async () => {
    const { run, histories } = setup([issue(1, { state: 'closed' }), issue(2)]);
    histories.set(1, [event(1), event(2, { event: 'unlabeled' })]);
    expect((await run()).actions[0]).toMatchObject({ issue: 1, reason: 'already-requested' });
  });

  it('uses the earliest request rather than the oldest issue number', async () => {
    const { run, histories, triggerWrites } = setup([issue(1), issue(2)]);
    histories.set(1, [event(2)]);
    histories.set(2, [event(1)]);
    expect((await run()).actions[0]).toMatchObject({ issue: 2, reason: 'already-requested' });
    expect(triggerWrites()).toHaveLength(0);
  });

  it('does not reset when a sibling reopens', async () => {
    const { run, histories, triggerWrites } = setup([issue(1), issue(2)]);
    histories.set(1, [event(1)]);
    histories.set(2, [event(2, { event: 'reopened' })]);
    expect((await run()).actions[0].reason).toBe('already-requested');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('permits one new attempt after representative reopen and fresh fixability', async () => {
    const { run, histories, triggerWrites, issues } = setup([issue(1), issue(2)]);
    histories.set(1, [
      event(1),
      event(2, { event: 'reopened' }),
      event(3, { label: { name: FIXABLE_LABEL } }),
    ]);
    expect((await run()).actions[0].action).toBe('requested');
    expect(triggerWrites()).toEqual([[1, [FIX_LABEL]]]);
    const representative = issues.get(1);
    if (!representative) throw new Error('Missing representative');
    representative.labels = representative.labels.filter((label) => label !== FIX_LABEL);
    expect((await run()).actions[0].reason).toBe('already-requested');
    expect(triggerWrites()).toHaveLength(1);
  });

  it('holds stale fixability carried across a reopen', async () => {
    const { run, histories, triggerWrites } = setup([issue(1)]);
    histories.set(1, [event(1), event(2, { event: 'reopened' })]);
    expect((await run()).actions[0].reason).toBe('awaiting-fresh-investigation');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('checks current linked PR state, including human PRs, before a reopen retry', async () => {
    const { run, histories, github, triggerWrites } = setup([issue(1)]);
    histories.set(1, [
      event(1),
      event(2, { event: 'reopened' }),
      event(3, { label: { name: FIXABLE_LABEL } }),
      linkedPr(4),
    ]);
    github.getFixPullRequest.mockResolvedValue({
      state: 'OPEN',
      mergedAt: null,
      closingIssues: [1],
    });
    expect((await run()).actions[0].reason).toBe('existing-fix-pr');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('does not redispatch after an uncertain trigger response', async () => {
    const { run, github, triggerWrites, issues } = setup([issue(1), issue(2)]);
    const addLabels = github.addLabelsOnce.getMockImplementation();
    if (!addLabels) throw new Error('Missing mock implementation');
    github.addLabelsOnce.mockImplementation(async (number, labels) => {
      await addLabels(number, labels);
      // GitHub accepted the request and the fixer consumed its label before we lost the response.
      const representative = issues.get(number);
      if (!representative) throw new Error('Missing representative');
      representative.labels = representative.labels.filter((label) => label !== FIX_LABEL);
      throw new Error('response lost');
    });
    expect((await run()).actions[0]).toMatchObject({ action: 'failed', reason: 'response lost' });
    expect((await run()).actions[0].reason).toBe('already-requested');
    expect(triggerWrites()).toHaveLength(1);
  });

  it('can request on a later run when the previous write left no request history', async () => {
    const { run, github, triggerWrites } = setup([issue(1)]);
    github.addLabelsOnce.mockRejectedValueOnce(new Error('request rejected'));
    expect((await run()).actions[0].action).toBe('failed');
    expect(triggerWrites()).toHaveLength(1);
    expect((await run()).actions[0].action).toBe('requested');
    expect(triggerWrites()).toHaveLength(2);
  });

  it('does not dispatch if preflight cannot verify the existing trigger label', async () => {
    const { run, github, triggerWrites } = setup([issue(1)]);
    github.checkLabel.mockRejectedValueOnce(new Error('label not found'));
    await expect(run()).rejects.toThrow('label not found');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('ignores ordinary PR mentions that do not close a sibling issue', async () => {
    const { run, histories, github, triggerWrites } = setup([issue(1)]);
    histories.set(1, [linkedPr(1)]);
    github.getFixPullRequest.mockResolvedValue({
      state: 'OPEN',
      mergedAt: null,
      closingIssues: [999],
    });
    expect((await run()).actions[0].action).toBe('requested');
    expect(triggerWrites()).toEqual([[1, [FIX_LABEL]]]);
  });

  it('skips a merged human fix without requiring an AI request label', async () => {
    const { run, histories, github, triggerWrites } = setup([
      issue(1, { state: 'closed' }),
      issue(2),
    ]);
    histories.set(1, [linkedPr(1)]);
    github.getFixPullRequest.mockResolvedValue({
      state: 'MERGED',
      mergedAt: event(2).created_at,
      closingIssues: [1],
    });
    expect((await run()).actions[0]).toMatchObject({ issue: 1, reason: 'already-fixed' });
    expect(triggerWrites()).toHaveLength(0);
  });

  it('allows a freshly investigated recurrence after a human fix', async () => {
    const { run, histories, github, triggerWrites } = setup([issue(1), issue(2)]);
    histories.set(1, [
      linkedPr(1),
      event(3, { event: 'reopened' }),
      event(4, { label: { name: FIXABLE_LABEL } }),
    ]);
    github.getFixPullRequest.mockResolvedValue({
      state: 'MERGED',
      mergedAt: event(2).created_at,
      closingIssues: [1],
    });
    expect((await run()).actions[0]).toMatchObject({ issue: 1, action: 'requested' });
    expect(triggerWrites()).toEqual([[1, [FIX_LABEL]]]);
  });

  it('does not treat an unmerged closed PR as a delivered fix', async () => {
    const { run, histories, github } = setup([issue(1)]);
    histories.set(1, [linkedPr(1)]);
    github.getFixPullRequest.mockResolvedValue({
      state: 'CLOSED',
      mergedAt: null,
      closingIssues: [1],
    });
    expect((await run()).actions[0].action).toBe('requested');
  });

  it('holds when a native fix relationship cannot be read', async () => {
    const { run, histories, github, triggerWrites } = setup([issue(1)]);
    histories.set(1, [linkedPr(1)]);
    github.getFixPullRequest.mockRejectedValue(new Error('GraphQL unavailable'));
    expect((await run()).actions[0].action).toBe('failed');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('requires the trusted automation account for live writes', async () => {
    const { run, github } = setup([issue(1)]);
    github.getAuthenticatedLogin.mockResolvedValue('someone-else');
    await expect(run()).rejects.toThrow('authored by kibanamachine');
    expect(github.addLabelsOnce).not.toHaveBeenCalled();
  });

  it('fails closed on unreadable history', async () => {
    const { run, github, triggerWrites } = setup([issue(1)]);
    github.getIssueTimeline.mockRejectedValue(new Error('GitHub unavailable'));
    expect((await run()).actions[0].action).toBe('failed');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('makes real history reads but zero writes in dry run', async () => {
    const { run, github } = setup([issue(1)]);
    expect((await run({ dryRun: true })).actions[0].action).toBe('would-request');
    expect(github.getIssueTimeline).toHaveBeenCalled();
    expect(github.addLabelsOnce).not.toHaveBeenCalled();
  });

  it('limits requests independently of the number of issues', async () => {
    const paths = ['a.spec.ts', 'b.spec.ts', 'c.spec.ts'];
    const { run, triggerWrites } = setup(
      paths.map((filePath, i) => fileWideIssue(i + 1, { filePath, labels: LABELS }))
    );
    const summary = await run({
      maxRequests: 2,
      report: flakyReport(paths.map((filePath) => flakyTest({ filePath }))),
    });
    expect(summary.actions.map(({ action }) => action)).toEqual(['requested', 'requested', 'held']);
    expect(summary.actions[2].reason).toBe('request-budget');
    expect(triggerWrites()).toHaveLength(2);
  });

  it('enforces the initial five-request budget exactly', async () => {
    const paths = Array.from({ length: 6 }, (_, index) => `test_${index}.spec.ts`);
    const { run, triggerWrites } = setup(
      paths.map((filePath, i) => fileWideIssue(i + 1, { filePath, labels: LABELS }))
    );
    const summary = await run({
      report: flakyReport(paths.map((filePath) => flakyTest({ filePath }))),
    });
    expect(triggerWrites()).toHaveLength(5);
    expect(summary.actions[5]).toMatchObject({ action: 'held', reason: 'request-budget' });
  });

  it.each([
    ['team-opted-out', [...LABELS, 'Team:Kibana Management']],
    ['awaiting-investigation', ['failed-test']],
    ['awaiting-investigation', [...LABELS, 'failure:inconclusive']],
  ])('holds %s', async (reason, labels) => {
    const { run, triggerWrites } = setup([issue(1, { labels })]);
    expect((await run()).actions[0].reason).toBe(reason);
    expect(triggerWrites()).toHaveLength(0);
  });

  it('does not request a version-only failure or a missing file', async () => {
    const { run, triggerWrites } = setup([issue(1)]);
    expect((await run({ fileExists: () => false })).actions[0].reason).toBe(
      'unknown-or-moved-file'
    );
    expect(
      (
        await run({
          report: flakyReport([
            flakyTest({
              byBranch: [{ branch: '9.5', builds: 20, failedBuilds: 3, buildFailRate: 0.15 }],
            }),
          ]),
        })
      ).actions[0].reason
    ).toBe('no-active-main-failure');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('reports exclusions without creating a request for an out-of-report issue', async () => {
    const { run, triggerWrites } = setup([
      fileWideIssue(1, { filePath: 'other.spec.ts', labels: LABELS }),
    ]);
    expect((await run()).outsideReport).toEqual([1]);
    expect(triggerWrites()).toHaveLength(0);
  });

  it('rechecks a representative that closes during selection', async () => {
    const { run, github, triggerWrites } = setup([issue(1)]);
    github.getIssue
      .mockResolvedValueOnce(issue(1))
      .mockResolvedValueOnce(issue(1, { state: 'closed' }));
    expect((await run()).actions[0].reason).toBe('changed-during-selection');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('rechecks a representative whose file identity changed during selection', async () => {
    const { run, github, triggerWrites } = setup([issue(1)]);
    github.getIssue
      .mockResolvedValueOnce(issue(1))
      .mockResolvedValueOnce(fileWideIssue(1, { filePath: 'other.spec.ts', labels: LABELS }));
    expect((await run()).actions[0].reason).toBe('changed-during-selection');
    expect(triggerWrites()).toHaveLength(0);
  });

  it('rechecks siblings for manual requests that arrived during selection', async () => {
    const { run, github, triggerWrites } = setup([issue(1), issue(2)]);
    github.getIssueTimeline
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([event(1)]);
    expect((await run()).actions[0].reason).toBe('changed-during-selection');
    expect(triggerWrites()).toHaveLength(0);
  });
});
