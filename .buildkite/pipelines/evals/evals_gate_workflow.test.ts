/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EvalsDecisionSuite } from './evals_gate_rules.ts';
import type { GateApi, GateContext, GatePullRequest } from './evals_gate_workflow.ts';
import { findGateCommentId, runEvalsGate } from './evals_gate_workflow.ts';

const HEAD = 'ffffffffffffffffffffffffffffffffffffffff';
const EARLIER = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const SUITES: EvalsDecisionSuite[] = [
  {
    id: 'agent',
    ciLabels: ['evals:agent'],
    requireDecisionOnPaths: { include: ['plugins/agent/**'], exclude: ['**/*.test.ts'] },
  },
  {
    id: 'gated',
    ciLabels: ['evals:gated'],
    requireDecisionOnPaths: { include: ['plugins/gated/**'] },
    regressionGate: {
      dataset: 'golden',
      evaluator: 'goal_pass',
      minAbsoluteDrop: 0.1,
      alpha: 0.05,
      maxBaselineAgeDays: 3,
    },
  },
  { id: 'smoke-tests', ciLabels: ['evals:smoke-tests'] },
];

interface FakeOptions {
  pr?: Partial<GatePullRequest>;
  changedFiles: string[];
  statuses?: Record<string, { state: string; description: string }>;
  commitShas?: string[];
  filesBetween?: string[];
  commentId?: number;
  openPrNumbers?: number[];
}

const createFake = ({
  pr = {},
  changedFiles,
  statuses = {},
  commitShas = [HEAD],
  filesBetween = [],
  commentId,
  openPrNumbers = [],
}: FakeOptions) => {
  const calls = {
    statuses: [] as Array<{ sha: string; state: string; description: string }>,
    comments: [] as string[],
    deletedComments: [] as number[],
    summaries: [] as string[],
    errors: [] as string[],
  };
  const api: GateApi = {
    getPullRequest: async (prNumber) => ({
      number: prNumber,
      baseRef: 'main',
      headSha: HEAD,
      draft: false,
      author: 'dev',
      labels: [],
      ...pr,
    }),
    findOpenPullRequestNumbers: async () => openPrNumbers,
    listChangedFiles: async () => changedFiles,
    listCommitShas: async () => commitShas,
    getStatus: async (sha, context) => statuses[`${sha}:${context}`],
    listFilesBetween: async () => filesBetween,
    setStatus: async (status) => {
      calls.statuses.push(status);
    },
    findComment: async () => commentId,
    upsertComment: async (_prNumber, _commentId, body) => {
      calls.comments.push(body);
    },
    deleteComment: async (id) => {
      calls.deletedComments.push(id);
    },
  };
  const summary = {
    addRaw: (text: string) => {
      calls.summaries.push(text);
      return summary;
    },
    write: async () => undefined,
  };
  const core = {
    info: () => undefined,
    error: (message: string) => calls.errors.push(message),
    summary,
  };
  return { api, core, calls };
};

const PR_EVENT: GateContext = {
  eventName: 'pull_request_target',
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: { pull_request: { number: 7 } },
};

const run = (options: FakeOptions, context: GateContext = PR_EVENT) => {
  const fake = createFake(options);
  return runEvalsGate({ api: fake.api, core: fake.core, context, readSuites: () => SUITES }).then(
    () => fake.calls
  );
};

describe('runEvalsGate', () => {
  it('passes PRs that touch no decision paths and removes a stale comment', async () => {
    const calls = await run({
      changedFiles: ['plugins/agent/a.test.ts', 'docs/x.md'],
      commentId: 3,
    });
    expect(calls.statuses).toEqual([
      { sha: HEAD, state: 'success', description: 'No evals decision required for these changes' },
    ]);
    expect(calls.deletedComments).toEqual([3]);
  });

  it('passes draft PRs', async () => {
    const calls = await run({ pr: { draft: true }, changedFiles: ['plugins/agent/a.ts'] });
    expect(calls.statuses[0].description).toBe('Draft PRs do not require an evals decision');
  });

  it('requires a decision and comments with the matched files', async () => {
    const calls = await run({ changedFiles: ['plugins/agent/a.ts', 'plugins/gated/b.ts'] });
    expect(calls.statuses).toEqual([
      {
        sha: HEAD,
        state: 'failure',
        description: 'Evals decision required: add evals:agent, evals:gated or evals:skip',
      },
    ]);
    expect(calls.comments.length).toBe(1);
    expect(calls.comments[0]).toMatch(/@dev/);
    expect(calls.comments[0]).toMatch(/`plugins\/gated\/b\.ts`/);
    expect(calls.comments[0]).toMatch(/<!-- evals-gate-comment -->/);
  });

  it('passes with the generic skip and deletes the comment', async () => {
    const calls = await run({
      pr: { labels: ['evals:skip', 'evals:gated'] },
      changedFiles: ['plugins/agent/a.ts', 'plugins/gated/b.ts'],
      commentId: 9,
    });
    expect(calls.statuses[0]).toEqual({
      sha: HEAD,
      state: 'success',
      description: 'Evals skipped: agent, gated',
    });
    expect(calls.deletedComments).toEqual([9]);
    expect(calls.comments).toEqual([]);
  });

  it('waits for the verdict of a gated suite', async () => {
    const calls = await run({
      pr: { labels: ['evals:gated'] },
      changedFiles: ['plugins/gated/b.ts'],
    });
    expect(calls.statuses[0].state).toBe('pending');
  });

  it('blocks on a regression verdict unless it is accepted', async () => {
    const statuses = {
      [`${HEAD}:kibana-evals/gated`]: { state: 'failure', description: 'goal_pass 0.55 → 0.32' },
    };
    const blocked = await run({
      pr: { labels: ['evals:gated'] },
      changedFiles: ['plugins/gated/b.ts'],
      statuses,
    });
    expect(blocked.statuses[0].state).toBe('failure');
    expect(blocked.statuses[0].description).toMatch(/gated regressed: goal_pass 0\.55 → 0\.32/);

    const accepted = await run({
      pr: { labels: ['evals:gated', 'evals:accept-regression'] },
      changedFiles: ['plugins/gated/b.ts'],
      statuses,
    });
    expect(accepted.statuses[0].state).toBe('success');
  });

  it('reuses an earlier verdict when no decision path changed since', async () => {
    const calls = await run({
      pr: { labels: ['evals:gated'] },
      changedFiles: ['plugins/gated/b.ts'],
      commitShas: [EARLIER, HEAD],
      statuses: {
        [`${EARLIER}:kibana-evals/gated`]: { state: 'success', description: 'no regression' },
      },
      filesBetween: ['docs/readme.md'],
    });
    expect(calls.statuses[0]).toEqual({
      sha: HEAD,
      state: 'success',
      description: 'gated: no regression (from eeeeeee)',
    });
  });

  it('re-evaluates every open PR with the commit when a verdict status arrives', async () => {
    const calls = await run(
      {
        pr: { labels: ['evals:gated'] },
        changedFiles: ['plugins/gated/b.ts'],
        statuses: {
          [`${HEAD}:kibana-evals/gated`]: { state: 'success', description: 'no regression' },
        },
        openPrNumbers: [7],
      },
      {
        eventName: 'status',
        repo: { owner: 'elastic', repo: 'kibana' },
        payload: { sha: HEAD, context: 'kibana-evals/gated' },
      }
    );
    expect(calls.statuses[0].state).toBe('success');
  });

  it('ignores status events from other contexts', async () => {
    const calls = await run(
      { changedFiles: [], openPrNumbers: [7] },
      {
        eventName: 'status',
        repo: { owner: 'elastic', repo: 'kibana' },
        payload: { sha: HEAD, context: 'kibana-ci' },
      }
    );
    expect(calls.statuses).toEqual([]);
  });

  it('never blocks when the gate itself fails', async () => {
    const fake = createFake({ changedFiles: [] });
    fake.api.listChangedFiles = async () => {
      throw new Error('boom');
    };
    await runEvalsGate({
      api: fake.api,
      core: fake.core,
      context: PR_EVENT,
      readSuites: () => SUITES,
    });
    expect(fake.calls.statuses).toEqual([
      {
        sha: HEAD,
        state: 'success',
        description: 'Evals gate errored, not enforced (see the workflow logs)',
      },
    ]);
    expect(fake.calls.errors[0]).toMatch(/boom/);
  });

  const STARTED = {
    [`${HEAD}:kibana-evals/gated`]: { state: 'pending', description: 'Running gated evals' },
  };

  it('leaves PRs against other branches alone when a status event finds them', async () => {
    const calls = await run(
      { pr: { baseRef: '9.6' }, changedFiles: ['plugins/gated/b.ts'], openPrNumbers: [7] },
      {
        eventName: 'status',
        repo: { owner: 'elastic', repo: 'kibana' },
        payload: { sha: HEAD, context: 'kibana-evals' },
      }
    );
    expect(calls.statuses).toEqual([]);
    expect(calls.comments).toEqual([]);
  });

  it('stops waiting when the eval build finished after the suite started', async () => {
    const calls = await run({
      pr: { labels: ['evals:gated'] },
      changedFiles: ['plugins/gated/b.ts'],
      statuses: {
        ...STARTED,
        [`${HEAD}:kibana-evals`]: { state: 'failure', description: 'Build failed' },
      },
    });
    expect(calls.statuses[0]).toEqual({
      sha: HEAD,
      state: 'success',
      description: 'gated inconclusive, not enforced: the eval build finished without a verdict',
    });
  });

  it('keeps waiting when a finished eval build never started the suite', async () => {
    // e.g. a build that only ran smoke-tests, before the gated suite's run label was added
    const calls = await run({
      pr: { labels: ['evals:gated'] },
      changedFiles: ['plugins/gated/b.ts'],
      statuses: { [`${HEAD}:kibana-evals`]: { state: 'success', description: 'Passed' } },
    });
    expect(calls.statuses[0].state).toBe('pending');
  });

  it('re-evaluates when the eval build status arrives', async () => {
    const calls = await run(
      {
        pr: { labels: ['evals:gated'] },
        changedFiles: ['plugins/gated/b.ts'],
        statuses: {
          ...STARTED,
          [`${HEAD}:kibana-evals`]: { state: 'error', description: 'Build canceled' },
        },
        openPrNumbers: [7],
      },
      {
        eventName: 'status',
        repo: { owner: 'elastic', repo: 'kibana' },
        payload: { sha: HEAD, context: 'kibana-evals' },
      }
    );
    expect(calls.statuses[0].state).toBe('success');
  });

  it('keeps a regression on the head blocking after evals:skip is added', async () => {
    const calls = await run({
      pr: { labels: ['evals:gated', 'evals:skip'] },
      changedFiles: ['plugins/gated/b.ts'],
      statuses: {
        [`${HEAD}:kibana-evals/gated`]: { state: 'failure', description: 'goal_pass 0.55 → 0.32' },
      },
    });
    expect(calls.statuses[0].state).toBe('failure');
  });

  it('keeps PR file names from breaking out of the code span in the comment', async () => {
    const calls = await run({ changedFiles: ['plugins/agent/x` @elastic/team `y.ts'] });
    expect(calls.comments[0]).toContain('- `plugins/agent/x @elastic/team y.ts`');
  });
});

describe('findGateCommentId', () => {
  const MARKER = '<!-- evals-gate-comment -->';

  it("finds the bot's comment and ignores a person quoting the marker", () => {
    expect(
      findGateCommentId([
        { id: 1, body: `quoting the bot: ${MARKER}`, user: { login: 'dev' } },
        {
          id: 2,
          body: `Evals decision required\n${MARKER}`,
          user: { login: 'github-actions[bot]' },
        },
      ])
    ).toBe(2);
    expect(
      findGateCommentId([{ id: 1, body: `quoting the bot: ${MARKER}`, user: { login: 'dev' } }])
    ).toBeUndefined();
  });
});
