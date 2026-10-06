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
import { Octokit } from '@octokit/rest';
import { createQueueClient } from './github_client.ts';

test('paginates issues without search or creation-date filters', async () => {
  const urls: URL[] = [];
  const github = new Octokit({
    request: {
      fetch: async (input: string | URL | Request) => {
        const url = new URL(String(input));
        urls.push(url);
        return new Response(JSON.stringify([{ number: url.searchParams.has('page') ? 2 : 1 }]), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            ...(urls.length === 1
              ? {
                  link: '<https://api.github.com/repos/elastic/kibana/issues?labels=flaky-test-fixer&state=open&per_page=100&page=2>; rel="next"',
                }
              : {}),
          },
        });
      },
    },
  });
  const client = createQueueClient(github, { owner: 'elastic', repo: 'kibana' });
  assert.deepEqual(
    (await client.listIssues('flaky-test-fixer')).map((issue) => issue.number),
    [1, 2]
  );
  assert.equal(urls.length, 2);
  assert.equal(urls[0].pathname, '/repos/elastic/kibana/issues');
  assert.equal(urls[0].searchParams.get('state'), 'open');
  assert.equal(urls[0].searchParams.get('since'), null);
});

test('queries every active status and deduplicates executions that move between status queries', async () => {
  const statuses: string[] = [];
  const github = new Octokit({
    request: {
      fetch: async (input: string | URL | Request) => {
        const url = new URL(String(input));
        const status = url.searchParams.get('status') ?? '';
        statuses.push(status);
        const response = new Response(
          JSON.stringify({
            total_count: 1,
            workflow_runs: [{ id: 100, display_title: 'Flaky Test Fixer #1 (request 10)', status }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
        Object.defineProperty(response, 'url', { value: String(input) });
        return response;
      },
    },
  });
  const client = createQueueClient(github, { owner: 'elastic', repo: 'kibana' });
  assert.equal((await client.listActiveRuns()).length, 1);
  assert.deepEqual(statuses, ['queued', 'in_progress', 'waiting', 'pending', 'requested']);
});

test('dispatches the default branch with an immutable request identity and requests a run ID', async () => {
  const github = new Octokit({
    request: {
      fetch: async (input: string | URL | Request, init?: RequestInit) => {
        assert.equal(
          String(input),
          'https://api.github.com/repos/elastic/kibana/actions/workflows/flaky-test-fixer.lock.yml/dispatches'
        );
        assert.equal(init?.method, 'POST');
        assert.deepEqual(JSON.parse(String(init?.body)), {
          ref: 'main',
          return_run_details: true,
          inputs: { issue_number: '42', request_id: '123', requested_by: 'engineer' },
        });
        assert.equal(new Headers(init?.headers).get('x-github-api-version'), '2022-11-28');
        return new Response(JSON.stringify({ workflow_run_id: 12345 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  const client = createQueueClient(github, { owner: 'elastic', repo: 'kibana' });
  assert.equal(
    await client.dispatch({
      issue: 42,
      event: 123,
      createdAt: '2026-10-02T16:00:00Z',
      requestedBy: 'engineer',
    }),
    12345
  );
});

test('pagination errors propagate instead of returning an incomplete workload', async () => {
  let calls = 0;
  const github = new Octokit({
    request: {
      fetch: async () => {
        if (++calls === 1)
          return new Response(JSON.stringify([{ number: 1 }]), {
            status: 200,
            headers: {
              'content-type': 'application/json',
              link: '<https://api.github.com/repos/elastic/kibana/issues?page=2>; rel="next"',
            },
          });
        return new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  await assert.rejects(
    createQueueClient(github, { owner: 'elastic', repo: 'kibana' }).listIssues('flaky-test-fixer'),
    /rate limit/
  );
});

test('maps issue history, run verification, and durable receipt APIs to the correct endpoints', async () => {
  const requests: Array<{ method: string; path: string; body: string }> = [];
  const github = new Octokit({
    request: {
      fetch: async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? 'GET';
        requests.push({ method, path: url.pathname, body: String(init?.body ?? '') });
        const result =
          url.pathname.endsWith('/events') ||
          (url.pathname.endsWith('/comments') && method === 'GET')
            ? [{ id: 123 }]
            : {
                id: 123,
                number: 42,
                display_title: 'Flaky Test Fixer #42 (request 12)',
                status: 'queued',
              };
        const response = new Response(JSON.stringify(result), {
          status: method === 'POST' ? 201 : 200,
          headers: { 'content-type': 'application/json' },
        });
        Object.defineProperty(response, 'url', { value: String(input) });
        return response;
      },
    },
  });
  const client = createQueueClient(github, { owner: 'elastic', repo: 'kibana' });
  assert.equal((await client.getIssue(42)).number, 42);
  assert.equal((await client.listEvents(42))[0].id, 123);
  assert.equal((await client.listComments(42))[0].id, 123);
  assert.equal((await client.getRun(123)).id, 123);
  assert.equal(await client.createComment(42, 'reservation'), 123);
  await client.updateComment(123, 'run link');
  assert.deepEqual(requests, [
    { method: 'GET', path: '/repos/elastic/kibana/issues/42', body: '' },
    { method: 'GET', path: '/repos/elastic/kibana/issues/42/events', body: '' },
    { method: 'GET', path: '/repos/elastic/kibana/issues/42/comments', body: '' },
    { method: 'GET', path: '/repos/elastic/kibana/actions/runs/123', body: '' },
    {
      method: 'POST',
      path: '/repos/elastic/kibana/issues/42/comments',
      body: '{"body":"reservation"}',
    },
    {
      method: 'PATCH',
      path: '/repos/elastic/kibana/issues/comments/123',
      body: '{"body":"run link"}',
    },
  ]);
});

interface OwnershipNode {
  __typename: 'Issue' | 'PullRequest';
  number: number;
  state: string;
  labels: {
    totalCount: number;
    nodes: Array<{ name: string } | null>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const ownershipNode = (number: number): OwnershipNode => ({
  __typename: 'Issue',
  number,
  state: 'CLOSED',
  labels: {
    totalCount: 1,
    nodes: [{ name: 'Team:Core' }],
    pageInfo: { hasNextPage: false, endCursor: null },
  },
});

const ownershipFixture = () => {
  const requests: string[] = [];
  const logs: string[] = [];
  const nodes = new Map<number, OwnershipNode | null>();
  let remaining = 1000;
  let missingGraphqlBudget = false;
  let graphqlError = false;
  let graphqlStatus = 200;
  let nextPage: OwnershipNode | null = null;
  let dropAfterQuery = false;
  let headerBudget: { remaining: number; reset: number } | undefined;
  const github = new Octokit({
    request: {
      fetch: async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.pathname === '/rate_limit') {
          return Response.json({
            resources: {
              core: { limit: 1000, remaining, reset: 123 },
              ...(missingGraphqlBudget
                ? {}
                : {
                    graphql: { limit: 1000, remaining, reset: 123 },
                  }),
            },
          });
        }
        assert.equal(url.pathname, '/graphql');
        const { query, variables } = JSON.parse(String(init?.body));
        assert.equal(variables.owner, 'elastic');
        assert.equal(variables.repo, 'kibana');
        requests.push(query);
        if (graphqlStatus !== 200) {
          return Response.json({ message: 'API rate limit exceeded' }, { status: graphqlStatus });
        }
        const repository: Record<string, OwnershipNode | null> = {};
        if (query.includes('query OwnershipLabels')) {
          assert.equal(variables.cursor, 'cursor-1');
          repository.issue = nextPage;
        } else {
          for (const match of query.matchAll(/issue_(\d+):/g)) {
            const number = Number(match[1]);
            repository[`issue_${number}`] = nodes.has(number)
              ? nodes.get(number) ?? null
              : ownershipNode(number);
          }
        }
        if (dropAfterQuery) remaining = 99;
        return Response.json(
          {
            data: {
              repository,
              rateLimit: { cost: 1, remaining, resetAt: '2026-10-06T15:00:00Z' },
            },
            ...(graphqlError
              ? { errors: [{ type: 'NOT_FOUND', message: 'Partial response' }] }
              : {}),
          },
          {
            headers: headerBudget
              ? {
                  'x-ratelimit-resource': 'graphql',
                  'x-ratelimit-limit': '1000',
                  'x-ratelimit-remaining': String(headerBudget.remaining),
                  'x-ratelimit-reset': String(headerBudget.reset),
                }
              : {},
          }
        );
      },
    },
  });
  return {
    client: createQueueClient(github, { owner: 'elastic', repo: 'kibana' }, (line) =>
      logs.push(line)
    ),
    setGraphqlStatus: (status: number) => {
      graphqlStatus = status;
    },
    setHeaderBudget: (headerRemaining: number, reset: number) => {
      headerBudget = { remaining: headerRemaining, reset };
    },
    requests,
    logs,
    nodes,
    setRemaining: (value: number) => {
      remaining = value;
    },
    omitGraphqlBudget: () => {
      missingGraphqlBudget = true;
    },
    failGraphql: () => {
      graphqlError = true;
    },
    setNextPage: (page: OwnershipNode) => {
      nextPage = page;
    },
    dropAfterQuery: () => {
      dropAfterQuery = true;
    },
  };
};

for (const count of [0, 1, 50, 51, 271]) {
  test(`ownership batches ${count} issues in groups of at most 50`, async () => {
    const f = ownershipFixture();
    const numbers = Array.from({ length: count }, (_, index) => index + 1);
    const issues = await f.client.getIssues([...numbers, ...numbers]);
    assert.deepEqual(
      issues?.map((issue) => issue.number),
      numbers
    );
    assert.equal(f.requests.length, Math.ceil(count / 50));
    for (const query of f.requests) {
      assert.ok([...query.matchAll(/issue_\d+:/g)].length <= 50);
    }
    assert.ok(issues?.every((issue) => issue.state === 'closed'));
  });
}

test('ownership validates issue numbers before constructing a query', async () => {
  const f = ownershipFixture();
  for (const number of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(f.client.getIssues([number]), /positive integer/);
  }
  assert.equal(f.requests.length, 0);
});

test('missing ownership and partial GraphQL errors fail instead of undercounting', async () => {
  const f = ownershipFixture();
  f.nodes.set(2, null);
  await assert.rejects(f.client.getIssues([1, 2]), /Incomplete ownership/);
  f.nodes.delete(2);
  f.failGraphql();
  await assert.rejects(f.client.getIssues([1, 2]), /Partial response/);
});

test('ownership collects all label pages', async () => {
  const f = ownershipFixture();
  const first = ownershipNode(1);
  first.labels.totalCount = 2;
  first.labels.pageInfo = { hasNextPage: true, endCursor: 'cursor-1' };
  f.nodes.set(1, first);
  const last = ownershipNode(1);
  last.labels.totalCount = 2;
  last.labels.nodes = [{ name: 'Team:Other' }];
  f.setNextPage(last);
  assert.deepEqual((await f.client.getIssues([1]))?.[0].labels, ['Team:Core', 'Team:Other']);
  assert.equal(f.requests.length, 2);
});

for (const problem of [
  'missing-node',
  'missing-label',
  'duplicate-label',
  'missing-cursor',
  'changed-count',
  'repeated-cursor',
]) {
  test(`incomplete label data stops ownership reads: ${problem}`, async () => {
    const f = ownershipFixture();
    const first = ownershipNode(1);
    if (problem === 'missing-node') first.labels.nodes = [null];
    if (problem === 'missing-label') first.labels.totalCount = 2;
    if (problem === 'duplicate-label') {
      first.labels.totalCount = 2;
      first.labels.nodes.push({ name: 'Team:Core' });
    }
    if (['missing-cursor', 'changed-count', 'repeated-cursor'].includes(problem)) {
      first.labels.totalCount = 2;
      first.labels.pageInfo = {
        hasNextPage: true,
        endCursor: problem === 'missing-cursor' ? null : 'cursor-1',
      };
      const last = ownershipNode(1);
      if (problem === 'repeated-cursor') {
        last.labels.totalCount = 2;
        last.labels.pageInfo = { hasNextPage: true, endCursor: 'cursor-1' };
      }
      f.setNextPage(last);
    }
    f.nodes.set(1, first);
    await assert.rejects(
      f.client.getIssues([1]),
      /Incomplete labels|Duplicate labels|Invalid label pagination|Labels changed/
    );
  });
}

test('low budget prevents queries and a mid-batch drop discards partial ownership', async () => {
  const f = ownershipFixture();
  f.setRemaining(99);
  assert.equal(await f.client.getIssues([1]), null);
  assert.equal(f.requests.length, 0);
  f.setRemaining(100);
  f.dropAfterQuery();
  assert.equal(await f.client.getIssues(Array.from({ length: 51 }, (_, index) => index + 1)), null);
  assert.equal(f.requests.length, 1);
});

test('low budget during label pagination discards partial ownership', async () => {
  const f = ownershipFixture();
  const first = ownershipNode(1);
  first.labels.totalCount = 2;
  first.labels.pageInfo = { hasNextPage: true, endCursor: 'cursor-1' };
  f.nodes.set(1, first);
  f.dropAfterQuery();
  assert.equal(await f.client.getIssues([1]), null);
  assert.equal(f.requests.length, 1);
});

test('budget reads expose allowances and reset times, and reject an unavailable GraphQL allowance', async () => {
  const f = ownershipFixture();
  const budget = await f.client.getApiBudget();
  assert.equal(budget.rest.limit, 1000);
  assert.equal(budget.graphql.reset, 123);
  assert.match(f.logs.join('\n'), /REST 1000\/1000.*GraphQL 1000\/1000/);
  f.omitGraphqlBudget();
  await assert.rejects(f.client.getApiBudget(), /budget is unavailable/);
});

test('closing references to PRs retain the REST ownership behavior', async () => {
  const f = ownershipFixture();
  const pr = ownershipNode(283343);
  pr.__typename = 'PullRequest';
  pr.state = 'MERGED';
  f.nodes.set(pr.number, pr);
  const result = await f.client.getIssues([pr.number]);
  assert.deepEqual(result, [
    {
      number: pr.number,
      state: 'closed',
      labels: ['Team:Core'],
      pull_request: {},
    },
  ]);
  assert.match(f.requests[0], /issueOrPullRequest/);
  assert.match(f.requests[0], /\.\.\. on PullRequest/);
});

test('response headers override a higher rate-limit endpoint budget until reset', async () => {
  const f = ownershipFixture();
  f.setHeaderBudget(99, Math.floor(Date.now() / 1000) + 3600);
  assert.equal((await f.client.getIssues([1]))?.length, 1);
  assert.equal((await f.client.getApiBudget()).graphql.remaining, 99);
  assert.equal(await f.client.getIssues([2]), null);
  assert.equal(f.requests.length, 1);
});

test('expired response budgets do not prevent work after reset', async () => {
  const f = ownershipFixture();
  f.setHeaderBudget(0, 1);
  assert.equal((await f.client.getIssues([1]))?.length, 1);
  assert.equal((await f.client.getApiBudget()).graphql.remaining, 1000);
});

for (const status of [403, 429]) {
  test(`GraphQL HTTP ${status} fails the batch without retries or partial ownership`, async () => {
    const f = ownershipFixture();
    f.setGraphqlStatus(status);
    await assert.rejects(f.client.getIssues([1, 2]), /rate limit exceeded/);
    assert.equal(f.requests.length, 1);
  });
}
