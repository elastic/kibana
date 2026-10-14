/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run with Node's built-in runner: node --test .github/scripts/label_flaky_fix_pr.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { Octokit } from '@octokit/rest';
import { labelFlakyFixPr } from './label_flaky_fix_pr.ts';
import { getTeamLabels } from './team_labels.ts';

const createFixture = (respond: (url: string, options: RequestInit) => Response) => {
  const requests: Array<{ url: string; options: RequestInit }> = [];
  const warnings: string[] = [];
  const messages: string[] = [];
  const github = new Octokit({
    request: {
      fetch: async (url: string, options: RequestInit) => {
        requests.push({ url, options });
        return respond(url, options);
      },
    },
    log: { debug() {}, info() {}, warn() {}, error() {} },
  });
  const options = {
    github,
    core: {
      info: (message: string) => {
        messages.push(message);
      },
      warning: (message: string) => {
        warnings.push(message);
      },
    },
    owner: 'elastic',
    repo: 'kibana',
    issueNumber: 123,
    prNumber: 456,
  };
  return { requests, warnings, messages, options };
};

const unrelatedLabels = ['failed-test', 'ai:fix-flaky', 'failure:ai-fixable', 'bug'];

test('selects exact ownership labels, including legacy labels, without copying issue status', () => {
  assert.deepEqual(
    getTeamLabels([
      ...unrelatedLabels,
      { name: 'Team:Search & ML UX' },
      'Team: SecuritySolution',
      ':ml',
      { name: ':ml' },
      'team:Example',
      {},
    ]),
    ['Team:Search & ML UX', 'Team: SecuritySolution', ':ml', 'team:Example']
  );
});

test('paginates source labels and adds only ownership labels to the created PR', async () => {
  const fixture = createFixture((url, { method, body }) => {
    if (method === 'POST') {
      assert.equal(url, 'https://api.github.com/repos/elastic/kibana/issues/456/labels');
      assert.equal(body, JSON.stringify({ labels: ['Team:Search & ML UX', ':ml'] }));
      return Response.json([]);
    }
    assert.match(url, /\/issues\/123\/labels\?per_page=100/);
    return url.includes('page=2')
      ? Response.json([{ name: ':ml' }])
      : Response.json(
          [{ name: 'Team:Search & ML UX' }, ...unrelatedLabels.map((name) => ({ name }))],
          {
            headers: {
              link: '<https://api.github.com/repos/elastic/kibana/issues/123/labels?per_page=100&page=2>; rel="next"',
            },
          }
        );
  });
  await labelFlakyFixPr(fixture.options);
  assert.equal(fixture.requests.length, 3);
  assert.equal(fixture.warnings.length, 0);
  assert.equal(fixture.messages.length, 1);
});

test('warns and performs no mutation when the source has no ownership labels', async () => {
  const fixture = createFixture(() => Response.json(unrelatedLabels.map((name) => ({ name }))));
  await labelFlakyFixPr(fixture.options);
  assert.equal(fixture.requests.length, 1);
  assert.match(fixture.warnings[0], /Source issue #123 has no ownership labels.*#456/);
});

test('retries are additive and preserve existing PR labels', async () => {
  const prLabels = new Set(['flaky-test-fixer', 'flaky-fix-check:passed', 'Team:Existing']);
  const fixture = createFixture((url, { method, body }) => {
    if (method === 'POST') {
      assert.equal(url, 'https://api.github.com/repos/elastic/kibana/issues/456/labels');
      assert.equal(body, JSON.stringify({ labels: ['Team:Search & ML UX'] }));
      prLabels.add('Team:Search & ML UX');
      return Response.json([...prLabels].map((name) => ({ name })));
    }
    return Response.json([{ name: 'Team:Search & ML UX' }]);
  });
  await labelFlakyFixPr(fixture.options);
  await labelFlakyFixPr(fixture.options);
  assert.deepEqual(
    [...prLabels],
    ['flaky-test-fixer', 'flaky-fix-check:passed', 'Team:Existing', 'Team:Search & ML UX']
  );
  assert.equal(fixture.requests.filter(({ options }) => options.method === 'POST').length, 2);
});

test('source lookup failure propagates without mutating the PR', async () => {
  const fixture = createFixture(() => Response.json({ message: 'Not Found' }, { status: 404 }));
  await assert.rejects(labelFlakyFixPr(fixture.options), /Not Found/);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.messages.length, 0);
});

test('label write failure propagates instead of reporting success', async () => {
  const fixture = createFixture((url, { method }) =>
    method === 'POST'
      ? Response.json({ message: 'Forbidden' }, { status: 403 })
      : Response.json([{ name: 'Team:Search & ML UX' }])
  );
  await assert.rejects(labelFlakyFixPr(fixture.options), /Forbidden/);
  assert.equal(fixture.messages.length, 0);
});

test('rejects missing, invalid, or identical source and target numbers before any request', async () => {
  const fixture = createFixture(() => {
    throw new Error('Unexpected API call');
  });
  for (const overrides of [
    { issueNumber: 0 },
    { issueNumber: NaN },
    { prNumber: 0 },
    { prNumber: 1.5 },
    { prNumber: Infinity },
    { prNumber: 123 },
  ]) {
    await assert.rejects(
      labelFlakyFixPr({ ...fixture.options, ...overrides }),
      /distinct positive/
    );
  }
  assert.equal(fixture.requests.length, 0);
});

test('compiled labeling job runs after PR creation without an agent tool or comment requirement', () => {
  const workflow = parse(readFileSync('.github/workflows/flaky-test-fixer.lock.yml', 'utf8')) as {
    jobs: Record<
      string,
      {
        needs: string[];
        if: string;
        steps: Array<{
          uses?: string;
          with?: Record<string, string | boolean>;
          env?: Record<string, string>;
        }>;
      }
    >;
  };
  const job = workflow.jobs.label_fix_pr;
  assert.deepEqual(job.needs, ['agent', 'safe_outputs']);
  assert.equal(job.if, "${{ !cancelled() && needs.safe_outputs.outputs.created_pr_number != '' }}");
  const checkout = job.steps.find(({ uses }) => uses?.startsWith('actions/checkout@'));
  assert.equal(checkout?.with?.ref, '${{ github.sha }}');
  assert.equal(checkout?.with?.['persist-credentials'], false);
  const labeling = job.steps.find(({ uses }) => uses?.startsWith('actions/github-script@'));
  assert.equal(
    labeling?.env?.SOURCE_ISSUE_NUMBER,
    '${{ github.event.issue.number || github.event.inputs.issue_number }}'
  );
  assert.equal(labeling?.env?.FIX_PR_NUMBER, '${{ needs.safe_outputs.outputs.created_pr_number }}');
});
