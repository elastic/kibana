/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchQueuedFixes, owningTeams, latestRequest, linkedIssues } from './queue.ts';
import type { QueueClient, Issue, Run, Comment, LabelEvent, FixRequest } from './queue.ts';

const date = (minute: number): string => new Date(Date.UTC(2026, 9, 2, 16, minute)).toISOString();
const fixture = () => {
  const issues = new Map<number, Issue>();
  const events = new Map<number, LabelEvent[]>();
  const comments = new Map<number, Comment[]>();
  const runs = new Map<number, Run>();
  const dispatched: FixRequest[] = [];
  const writes: string[] = [];
  const logs: string[] = [];
  let hideRuns = false;

  const addIssue = (number: number, teams = ['Team:Core'], event = number): Issue => {
    const issue: Issue = { number, state: 'open', labels: ['ai:fix-flaky', ...teams] };
    issues.set(number, issue);
    events.set(number, [
      {
        id: event,
        event: 'labeled',
        label: { name: 'ai:fix-flaky' },
        created_at: date(event),
        actor: { login: 'kibanamachine', type: 'User' },
      },
    ]);
    comments.set(number, []);
    return issue;
  };
  const addPr = (number: number, linked: number[], labels: string[] = []): void => {
    issues.set(number, {
      number,
      state: 'open',
      labels: ['flaky-test-fixer', ...labels],
      pull_request: {},
      body: linked.map((issue) => `Fixes #${issue}`).join('\n'),
    });
  };
  const addRun = (issue: number, status = 'in_progress', request = issue): number => {
    const id = runs.size + 100;
    runs.set(id, { id, display_title: `Flaky Test Fixer #${issue} (request ${request})`, status });
    return id;
  };
  const receipt = (
    issue: number,
    event: number,
    run: number | 'pending',
    author = 'github-actions[bot]'
  ): void => {
    comments.set(issue, [
      {
        id: 10 + issue,
        body: `<!-- flaky-fix-queue request:${event} run:${run} -->`,
        user: { login: author },
        created_at: date(event),
      },
    ]);
  };
  const client: QueueClient = {
    listIssues: async (label) =>
      [...issues.values()].filter(
        (issue) => issue.state === 'open' && issue.labels.includes(label)
      ),
    getIssue: async (number) => {
      const issue = issues.get(number);
      assert.ok(issue, `Missing issue ${number}`);
      return structuredClone(issue);
    },
    listEvents: async (number) => structuredClone(events.get(number) ?? []),
    listComments: async (number) => structuredClone(comments.get(number) ?? []),
    listActiveRuns: async () =>
      hideRuns ? [] : [...runs.values()].filter((run) => run.status !== 'completed'),
    getRun: async (id) => {
      const run = runs.get(id);
      assert.ok(run, `Missing run ${id}`);
      return run;
    },
    createComment: async (issue, body) => {
      writes.push('receipt');
      const id = 1000 + issue;
      comments.set(issue, [
        ...(comments.get(issue) ?? []),
        { id, body, created_at: date(100), user: { login: 'github-actions[bot]' } },
      ]);
      return id;
    },
    updateComment: async (id, body) => {
      writes.push('update');
      const comment = [...comments.values()].flat().find((entry) => entry.id === id);
      assert.ok(comment);
      comment.body = body;
    },
    dispatch: async (request) => {
      writes.push('dispatch');
      dispatched.push(request);
      return addRun(request.issue, 'queued', request.event);
    },
  };
  const sweep = (
    options: {
      dryRun?: boolean;
      maxOpenFixesPerTeam?: number;
      maxConcurrentFixRunsPerTeam?: number;
    } = {}
  ) => dispatchQueuedFixes({ client, log: (message) => logs.push(message), ...options });
  return {
    issues,
    events,
    comments,
    runs,
    dispatched,
    writes,
    logs,
    client,
    addIssue,
    addPr,
    addRun,
    receipt,
    sweep,
    hideRuns: () => {
      hideRuns = true;
    },
  };
};

test('normalizes ownership, supports legacy labels, and conservatively groups unowned issues', () => {
  assert.deepEqual(
    owningTeams({
      number: 1,
      state: 'open',
      labels: ['Team: Core', { name: 'team:core' }, ':ml', 'failed-test'],
    }),
    ['team:core', ':ml'].sort()
  );
  assert.deepEqual(owningTeams({ number: 1, state: 'open', labels: [] }), ['unowned']);
});

test('recognizes closing references, including full Kibana issue URLs, without treating mentions as coverage', () => {
  assert.deepEqual(
    linkedIssues(
      'Fixes #12. Closes #12. resolves https://github.com/elastic/kibana/issues/13. Related #14'
    ),
    [12, 13]
  );
  assert.deepEqual(linkedIssues(null), []);
});

test('identifies the latest label application and its requester, not issue creation order', () => {
  const f = fixture();
  const issue = f.addIssue(1);
  const earlier = f.events.get(1) ?? [];
  const removed: LabelEvent = {
    id: 2,
    event: 'unlabeled',
    label: { name: 'ai:fix-flaky' },
    created_at: date(2),
  };
  assert.equal(latestRequest(issue, [...earlier, removed]), undefined);
  const reapplied: LabelEvent = { ...earlier[0], id: 3, created_at: date(3) };
  assert.equal(latestRequest(issue, [reapplied, removed, ...earlier])?.event, 3);
});

test('a 13-request same-team burst admits one; another team still progresses', async () => {
  const f = fixture();
  for (let number = 13; number >= 1; number--) f.addIssue(number);
  f.addIssue(20, ['Team:ResponseOps']);
  assert.deepEqual(await f.sweep(), [1, 20]);
  assert.deepEqual(f.writes, ['receipt', 'dispatch', 'update', 'receipt', 'dispatch', 'update']);
  assert.equal(f.dispatched[0].requestedBy, 'kibanamachine');
  assert.equal(f.issues.get(2)?.labels.includes('ai:fix-flaky'), true);
});

test('uses label application time rather than the issue number to choose the next request', async () => {
  const f = fixture();
  f.addIssue(1, ['Team:Core'], 9);
  f.addIssue(200, ['Team:Core'], 1);
  assert.deepEqual(await f.sweep(), [200]);
});

test('five open fixer PRs stop automatic admission, including PRs linked to old or closed issues', async () => {
  const f = fixture();
  for (let number = 1; number <= 5; number++) {
    const issue = f.addIssue(number);
    issue.state = 'closed';
    f.addPr(100 + number, [number]);
  }
  f.addIssue(6);
  assert.deepEqual(await f.sweep(), []);
  f.issues.delete(101);
  assert.deepEqual(await f.sweep(), [6]);
});

test('counts a PR once even when it closes multiple same-team issues', async () => {
  const f = fixture();
  for (let number = 1; number <= 4; number++) f.addIssue(number);
  f.addPr(100, [1, 2, 3]);
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 2 }), [4]);
});

test('does not double count an active execution and the PR it produced', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  f.addPr(100, [1]);
  f.addRun(1);
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 2, maxConcurrentFixRunsPerTeam: 2 }), [2]);
});

for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
  test(`${status} executions occupy team capacity even if their issue no longer has the request label`, async () => {
    const f = fixture();
    f.addIssue(1).labels = ['Team:Core'];
    f.addIssue(2);
    f.addRun(1, status);
    assert.deepEqual(await f.sweep(), []);
  });
}

test('manual executions count against automatic capacity', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  f.runs.set(100, { id: 100, status: 'queued', display_title: 'Flaky Test Fixer #1 (manual)' });
  assert.deepEqual(await f.sweep(), []);
});

test('unidentified legacy active executions pause the rollout until they drain', async () => {
  const f = fixture();
  f.addIssue(1);
  f.runs.set(100, { id: 100, status: 'in_progress', display_title: 'Flaky Test Fixer' });
  assert.deepEqual(await f.sweep(), []);
});

test('a repeated sweep never dispatches an admitted request twice, even when run listing is stale', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  assert.deepEqual(await f.sweep(), [1]);
  f.hideRuns();
  assert.deepEqual(await f.sweep(), []);
  assert.equal(f.dispatched.length, 1);
});

test('a completed failed attempt releases capacity but is not automatically retried', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  const id = f.addRun(1, 'completed');
  f.receipt(1, 1, id);
  assert.deepEqual(await f.sweep(), [2]);
  assert.deepEqual(
    f.dispatched.map((entry) => entry.issue),
    [2]
  );
});

test('reapplying the label creates a fresh request after an unsuccessful attempt', async () => {
  const f = fixture();
  f.addIssue(1, ['Team:Core'], 10);
  const id = f.addRun(1, 'completed', 1);
  f.receipt(1, 1, id);
  assert.deepEqual(await f.sweep(), [1]);
  assert.equal(f.dispatched[0].event, 10);
});

test('an unresolved admission blocks its team without blindly retrying; other teams can proceed', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  f.addIssue(3, ['Team:Search']);
  f.receipt(1, 1, 'pending');
  assert.deepEqual(await f.sweep(), [3]);
});

test('comments from other authors cannot forge an admission receipt', async () => {
  const f = fixture();
  f.addIssue(1);
  f.receipt(1, 1, 'pending', 'someone');
  assert.deepEqual(await f.sweep(), [1]);
});

test('legacy fixer outcomes prevent retrying the old label request', async () => {
  const f = fixture();
  f.addIssue(1);
  f.comments.set(1, [
    {
      id: 1,
      body: '<!-- gh-aw-agentic-workflow: Flaky Test Fixer, workflow_id: flaky-test-fixer -->',
      user: { login: 'kibanamachine' },
      created_at: date(2),
    },
  ]);
  assert.deepEqual(await f.sweep(), []);
});

test('all ownership labels must have capacity, and one PR consumes a slot in each owning team', async () => {
  const f = fixture();
  f.addIssue(1, ['Team:Core', 'Team:Search']);
  f.addPr(100, [1]);
  f.addIssue(2, ['Team:Search']);
  f.addIssue(3, ['Team:Other']);
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 1 }), [3]);
});

test('issues without ownership share a bounded fallback bucket', async () => {
  const f = fixture();
  f.addIssue(1, []);
  f.addIssue(2, []);
  assert.deepEqual(await f.sweep(), [1]);
});

test('PRs without parsed issue links still consume their labelled team budget', async () => {
  const f = fixture();
  f.addPr(100, [], ['Team:Core']);
  f.addIssue(1);
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 1 }), []);
});

test('a PR closing the exact requested issue prevents another dispatch', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addPr(100, [1]);
  assert.deepEqual(await f.sweep(), []);
});

for (const change of ['closed', 'unlabelled', 'relabelled', 'reassigned']) {
  test(`revalidates ${change} requests immediately before admitting`, async () => {
    const f = fixture();
    f.addIssue(1);
    const getIssue = f.client.getIssue;
    let calls = 0;
    f.client.getIssue = async (number) => {
      const result = await getIssue(number);
      if (++calls === 1) {
        if (change === 'closed') result.state = 'closed';
        if (change === 'unlabelled') result.labels = ['Team:Core'];
        if (change === 'reassigned') result.labels = ['ai:fix-flaky', 'Team:Other'];
        if (change === 'relabelled') f.addIssue(1, ['Team:Core'], 20);
      }
      return result;
    };
    assert.deepEqual(await f.sweep(), []);
    assert.deepEqual(f.writes, []);
  });
}

test('dry-run applies the same budget and ordering without any writes', async () => {
  const f = fixture();
  for (let number = 1; number <= 13; number++) f.addIssue(number);
  assert.deepEqual(await f.sweep({ dryRun: true }), [1]);
  assert.deepEqual(f.writes, []);
});

test('incomplete API data fails closed before admission', async () => {
  const f = fixture();
  f.addIssue(1);
  f.client.listActiveRuns = async () => {
    throw new Error('rate limited');
  };
  await assert.rejects(f.sweep(), /rate limited/);
  assert.deepEqual(f.writes, []);
});

test('failure to persist the reservation never dispatches a fixer', async () => {
  const f = fixture();
  f.addIssue(1);
  f.client.createComment = async () => {
    throw new Error('forbidden');
  };
  await assert.rejects(f.sweep(), /forbidden/);
  assert.deepEqual(f.dispatched, []);
});

test('ambiguous dispatch failure leaves a durable reservation and cannot retry on the next sweep', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addIssue(2);
  f.client.dispatch = async () => {
    throw new Error('connection reset');
  };
  await assert.rejects(f.sweep(), /connection reset/);
  assert.deepEqual(await f.sweep(), []);
  assert.deepEqual(f.writes, ['receipt']);
});

test('a receipt update failure cannot cause another dispatch', async () => {
  const f = fixture();
  f.addIssue(1);
  f.client.updateComment = async () => {
    throw new Error('rate limited');
  };
  await assert.rejects(f.sweep(), /rate limited/);
  f.hideRuns();
  assert.deepEqual(await f.sweep(), []);
  assert.equal(f.dispatched.length, 1);
});

test('missing or mismatched dispatch response fails closed', async () => {
  for (const mode of ['missing', 'mismatch']) {
    const f = fixture();
    f.addIssue(1);
    f.client.dispatch = async () => {
      if (mode === 'missing') return 0;
      f.runs.set(100, {
        id: 100,
        status: 'queued',
        display_title: 'Flaky Test Fixer #99 (request 99)',
      });
      return 100;
    };
    await assert.rejects(f.sweep(), /no run ID|Unexpected identity/);
    assert.match(f.comments.get(1)?.[0].body ?? '', /run:pending/);
  }
});

test('rejects invalid capacity settings before reading or writing GitHub', async () => {
  const f = fixture();
  for (const value of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(f.sweep({ maxOpenFixesPerTeam: value }), /positive integers/);
    await assert.rejects(f.sweep({ maxConcurrentFixRunsPerTeam: value }), /positive integers/);
  }
  assert.deepEqual(f.writes, []);
});

test('successive batches stay within the outstanding cap as fixers finish and PRs close', async () => {
  const f = fixture();
  for (let number = 1; number <= 13; number++) f.addIssue(number);
  for (let number = 1; number <= 5; number++) {
    assert.deepEqual(await f.sweep(), [number]);
    for (const run of f.runs.values()) run.status = 'completed';
    f.issues.get(number)?.labels.splice(0, 1);
    f.addPr(100 + number, [number]);
  }
  assert.deepEqual(await f.sweep(), []);
  f.issues.delete(101);
  assert.deepEqual(await f.sweep(), [6]);
});

test('varied bursts respect every team budget and never admit the same request twice', async () => {
  for (let count = 1; count <= 40; count++) {
    const f = fixture();
    for (let number = count; number >= 1; number--) f.addIssue(number, [`Team:${number % 4}`]);
    const admitted = await f.sweep({ maxOpenFixesPerTeam: 3, maxConcurrentFixRunsPerTeam: 2 });
    for (let team = 0; team < 4; team++)
      assert.ok(admitted.filter((issue) => issue % 4 === team).length <= 2);
    await f.sweep({ maxOpenFixesPerTeam: 3, maxConcurrentFixRunsPerTeam: 2 });
    assert.equal(new Set(f.dispatched.map((request) => request.event)).size, f.dispatched.length);
  }
});

test('a multi-team reservation still blocks its free owner when its other owner is already full', async () => {
  const f = fixture();
  f.addIssue(1, ['Team:Core', 'Team:Search']);
  f.receipt(1, 1, 'pending');
  f.addIssue(2, ['Team:Search']);
  for (let number = 10; number <= 14; number++) {
    f.addIssue(number).state = 'closed';
    f.addPr(100 + number, [number]);
  }
  assert.deepEqual(await f.sweep(), []);
});

test('does not read histories for a backlog whose entire owning team is already at capacity', async () => {
  const f = fixture();
  f.addIssue(1);
  f.addPr(100, [1]);
  f.addIssue(2);
  f.client.listEvents = async () => {
    throw new Error('unnecessary history request');
  };
  f.client.listComments = async () => {
    throw new Error('unnecessary comment request');
  };
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 1 }), []);
});

test('never retries a known attempt if its run cannot be read', async () => {
  const f = fixture();
  f.addIssue(1);
  f.receipt(1, 1, 123);
  f.client.getRun = async () => {
    throw new Error('run expired');
  };
  await assert.rejects(f.sweep(), /run expired/);
  assert.deepEqual(f.writes, []);
});

test('closed and unlabelled requests are not queued, and missing label history is deferred', async () => {
  const f = fixture();
  f.addIssue(1).state = 'closed';
  f.addIssue(2).labels = ['Team:Core'];
  f.addIssue(3);
  f.events.set(3, []);
  assert.deepEqual(await f.sweep(), []);
});

test('an issue label added to a PR cannot dispatch the fixer', async () => {
  const f = fixture();
  f.addPr(100, []);
  f.issues.get(100)?.labels.push('ai:fix-flaky');
  assert.deepEqual(await f.sweep(), []);
});

test('a human mention of a previous fixer does not mark the current request as attempted', async () => {
  const f = fixture();
  f.addIssue(1);
  f.comments.set(1, [
    {
      id: 1,
      body: 'workflow_id: flaky-test-fixer',
      user: { login: 'engineer' },
      created_at: date(10),
    },
  ]);
  assert.deepEqual(await f.sweep(), [1]);
});

test('a fixer finishing during the workload read cannot disappear between execution and PR counts', async () => {
  const f = fixture();
  f.addIssue(1).state = 'closed';
  f.addIssue(2).state = 'closed';
  f.addIssue(3);
  f.addIssue(4);
  f.addPr(101, [1]);
  f.addPr(102, [2]);
  const runId = f.addRun(3);
  const originalListIssues = f.client.listIssues;
  f.client.listIssues = async (label) => {
    const result = await originalListIssues(label);
    if (label === 'flaky-test-fixer') {
      f.runs.set(runId, {
        id: runId,
        status: 'completed',
        display_title: 'Flaky Test Fixer #3 (request 3)',
      });
      const issue = f.issues.get(3);
      assert.ok(issue);
      issue.labels = issue.labels.filter((name) => name !== 'ai:fix-flaky');
      f.addPr(103, [3]);
    }
    return result;
  };
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 3 }), []);
  assert.deepEqual(await f.sweep({ maxOpenFixesPerTeam: 3 }), []);
});

test('human label requests never get dispatched by a later queue sweep', async () => {
  const f = fixture();
  f.addIssue(1);
  const event = f.events.get(1)?.[0];
  assert.ok(event);
  event.actor = { login: 'engineer', type: 'User' };
  f.addIssue(2);
  assert.deepEqual(await f.sweep(), [2]);
  for (const run of f.runs.values()) run.status = 'completed';
  assert.deepEqual(await f.sweep(), []);
  assert.deepEqual(
    f.dispatched.map((request) => request.issue),
    [2]
  );
});

test('a human reapplying a bot request switches it to the direct fixer path', async () => {
  const f = fixture();
  f.addIssue(1);
  const events = f.events.get(1);
  assert.ok(events);
  events.push({
    ...events[0],
    id: 2,
    created_at: date(2),
    actor: { login: 'engineer', type: 'User' },
  });
  assert.deepEqual(await f.sweep(), []);
  assert.deepEqual(f.writes, []);
});

for (const actor of [
  { login: 'custom-automation', type: 'Bot' },
  { login: 'github-actions[bot]' },
  { login: 'kibanamachine', type: 'User' },
  { login: 'elasticmachine', type: 'User' },
]) {
  test(`automation actor ${actor.login} stays subject to queue limits`, async () => {
    const f = fixture();
    for (const number of [1, 2]) {
      f.addIssue(number);
      const event = f.events.get(number)?.[0];
      assert.ok(event);
      event.actor = actor;
    }
    assert.deepEqual(await f.sweep(), [1]);
  });
}

test('a bot request changed to a human request during the sweep is not dispatched', async () => {
  const f = fixture();
  f.addIssue(1);
  f.client.getIssue = async () => {
    const event = f.events.get(1)?.[0];
    assert.ok(event);
    event.id = 2;
    event.actor = { login: 'engineer', type: 'User' };
    const issue = f.issues.get(1);
    assert.ok(issue);
    return issue;
  };
  assert.deepEqual(await f.sweep(), []);
  assert.deepEqual(f.writes, []);
});
