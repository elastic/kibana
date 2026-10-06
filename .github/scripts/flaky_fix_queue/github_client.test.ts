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
