/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { labelFlakyFixPr } from './label_flaky_fix_pr.ts';
import { getTeamLabels } from './team_labels.ts';

type GitHubClient = Parameters<typeof labelFlakyFixPr>[0]['github'];
interface IssueParameters {
  owner: string;
  repo: string;
  issue_number: number;
}

const createFixture = (labels: string[]) => {
  const listLabelsOnIssue = async (_parameters: IssueParameters) => ({});
  const paginate = mock.fn(
    async (
      _method: GitHubClient['rest']['issues']['listLabelsOnIssue'],
      _parameters: IssueParameters & { per_page: number }
    ) => labels.map((name) => ({ name }))
  );
  const addLabels = mock.fn(async (_parameters: IssueParameters & { labels: string[] }) => ({}));
  const info = mock.fn();
  const warning = mock.fn();
  // This partial mock intentionally omits Octokit's unrelated APIs and endpoint metadata.
  const github = { paginate, rest: { issues: { listLabelsOnIssue, addLabels } } };
  const options = {
    github: github as object as GitHubClient,
    core: { info, warning },
    owner: 'elastic',
    repo: 'kibana',
    issueNumber: 123,
    prNumber: 456,
  };
  return { options, paginate, listLabelsOnIssue, addLabels, info, warning };
};

test('selects and deduplicates ownership labels while preserving their exact names', () => {
  assert.deepEqual(
    getTeamLabels([
      'failed-test',
      'ai:fix-flaky',
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

test('reads all source issue labels through pagination and adds only ownership labels to the fix PR', async () => {
  const fixture = createFixture(['failed-test', 'Team:Search & ML UX', ':ml', 'bug']);
  await labelFlakyFixPr(fixture.options);
  assert.equal(fixture.paginate.mock.callCount(), 1);
  assert.deepEqual(fixture.paginate.mock.calls[0].arguments, [
    fixture.listLabelsOnIssue,
    { owner: 'elastic', repo: 'kibana', issue_number: 123, per_page: 100 },
  ]);
  assert.equal(fixture.addLabels.mock.callCount(), 1);
  assert.deepEqual(fixture.addLabels.mock.calls[0].arguments, [
    {
      owner: 'elastic',
      repo: 'kibana',
      issue_number: 456,
      labels: ['Team:Search & ML UX', ':ml'],
    },
  ]);
  assert.equal(fixture.warning.mock.callCount(), 0);
  assert.equal(fixture.info.mock.callCount(), 1);
});

test('warns without writing when the source issue has no ownership labels', async () => {
  for (const labels of [[], ['failed-test', 'ai:fix-flaky', 'bug']]) {
    const fixture = createFixture(labels);
    await labelFlakyFixPr(fixture.options);
    assert.equal(fixture.addLabels.mock.callCount(), 0);
    assert.equal(fixture.warning.mock.callCount(), 1);
    assert.equal(fixture.info.mock.callCount(), 0);
  }
});

test('propagates source lookup failures without writing labels', async () => {
  const fixture = createFixture([]);
  fixture.paginate.mock.mockImplementation(async () => {
    throw new Error('Source lookup failed');
  });
  await assert.rejects(labelFlakyFixPr(fixture.options), /Source lookup failed/);
  assert.equal(fixture.addLabels.mock.callCount(), 0);
  assert.equal(fixture.info.mock.callCount(), 0);
});

test('propagates label write failures without reporting success', async () => {
  const fixture = createFixture(['Team:Search & ML UX']);
  fixture.addLabels.mock.mockImplementation(async () => {
    throw new Error('Label write failed');
  });
  await assert.rejects(labelFlakyFixPr(fixture.options), /Label write failed/);
  assert.equal(fixture.info.mock.callCount(), 0);
});

test('rejects invalid or identical source and target numbers before any API call', async () => {
  const fixture = createFixture([]);
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
  assert.equal(fixture.paginate.mock.callCount(), 0);
  assert.equal(fixture.addLabels.mock.callCount(), 0);
});
