/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// These scripts run via actions/github-script outside the Jest project, so
// they use Node's built-in runner:
//   node --test .github/scripts/link_issues_to_fix_pr.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  linkIssuesToFixPr,
  linkedIssuesFromBody,
  parseIssueList,
  bodyWithBlock,
  entriesFromBlock,
} = require('./link_issues_to_fix_pr');

const FIXER_BODY = [
  'Fixes #100 - likely introduced by #99 (cc @someone)',
  '',
  '### Summary',
  '- patches the shared helper',
  '',
  '> [!NOTE]',
  '> Share feedback in #kibana-qa.',
  '',
  '<!-- gh-aw-workflow-id: flaky-test-fixer -->',
].join('\n');

// A stub of the Octokit surface the script uses; records every write it makes.
const fakeGithub = ({ pr, issues, comments = {} }) => {
  const updates = [];
  const created = [];
  return {
    updates,
    created,
    paginate: async (endpoint, params) => endpoint(params),
    rest: {
      pulls: {
        get: async () => ({ data: pr }),
        update: async (params) => {
          updates.push(params);
          pr.body = params.body;
        },
      },
      issues: {
        get: async ({ issue_number: number }) => {
          if (!issues[number]) {
            const err = new Error('Not Found');
            err.status = 404;
            throw err;
          }
          return { data: issues[number] };
        },
        listComments: async ({ issue_number: number }) => comments[number] ?? [],
        createComment: async (params) => {
          created.push(params);
        },
      },
    },
  };
};

const failedTestIssue = (number, title) => ({
  number,
  title,
  state: 'open',
  labels: [{ name: 'failed-test' }, { name: 'Team:Visualizations' }],
});

test('linkedIssuesFromBody reads every closing-reference form GitHub honors', () => {
  const body = [
    'Fixes #1',
    'closes elastic/kibana#2',
    'Resolved https://github.com/elastic/kibana/issues/3',
    'fixes #1',
    'see #4',
    'fixes elastic/other-repo#5',
  ].join('\n');
  assert.deepEqual(linkedIssuesFromBody(body), [1, 2, 3]);
  assert.deepEqual(linkedIssuesFromBody(undefined), []);
});

test('parseIssueList accepts the shapes an agent writes', () => {
  assert.deepEqual(parseIssueList('#285479, 285603 #285607'), [285479, 285603, 285607]);
  assert.deepEqual(parseIssueList('285479,285479'), [285479]);
  assert.deepEqual(parseIssueList(''), []);
});

test('bodyWithBlock inserts the block above the NOTE and the gh-aw footer', () => {
  const updated = bodyWithBlock(FIXER_BODY, [{ number: 101, title: '[Lens] flaky spec' }]);
  assert.match(updated, /- Fixes #101 — \[Lens\] flaky spec/);
  assert.ok(
    updated.indexOf('Fixes #101') < updated.indexOf('> [!NOTE]'),
    'the block must precede the trailing NOTE'
  );
  assert.ok(updated.startsWith('Fixes #100 - likely introduced by #99'));
  assert.match(updated, /### Summary/);
});

test('bodyWithBlock appends the block when the body has no footer', () => {
  const updated = bodyWithBlock('Fixes #100\n\n### Summary\n- a fix\n', [
    { number: 101, title: 'x' },
  ]);
  assert.ok(updated.trimEnd().endsWith('<!-- flaky-fix-linked-issues:end -->'));
});

test('bodyWithBlock rewrites an existing block in place instead of appending a second one', () => {
  const once = bodyWithBlock(FIXER_BODY, [{ number: 101, title: 'first' }]);
  const twice = bodyWithBlock(once, [...entriesFromBlock(once), { number: 102, title: 'second' }]);
  assert.equal(twice.match(/flaky-fix-linked-issues:start/g).length, 1);
  assert.deepEqual(entriesFromBlock(twice), [
    { number: 101, title: 'first' },
    { number: 102, title: 'second' },
  ]);
});

test('linkIssuesToFixPr adds closing references and points each issue at the PR', async () => {
  const pr = {
    number: 200,
    title: '[Lens] Wait for the field commit',
    state: 'open',
    merged: false,
    body: FIXER_BODY,
  };
  const github = fakeGithub({
    pr,
    issues: {
      101: failedTestIssue(101, 'first spec'),
      102: failedTestIssue(102, 'second spec'),
    },
  });

  const result = await linkIssuesToFixPr({
    github,
    prNumber: 200,
    issueNumbers: [101, 102, 101],
  });

  assert.deepEqual(result.added, [101, 102]);
  assert.deepEqual(result.notified, [101, 102]);
  assert.equal(github.updates.length, 1);
  assert.deepEqual(
    linkedIssuesFromBody(github.updates[0].body).sort((a, b) => a - b),
    [100, 101, 102]
  );
  assert.match(github.created[0].body, /#200 \(`\[Lens\] Wait for the field commit`\) fixes/);
  assert.match(github.created[0].body, /<!-- flaky-fix-linked-to-pr:200 -->/);
});

test('linkIssuesToFixPr skips issues that are not open `failed-test` issues', async () => {
  const pr = { number: 200, title: 'fix', state: 'open', merged: false, body: 'Fixes #100' };
  const github = fakeGithub({
    pr,
    issues: {
      101: { ...failedTestIssue(101, 'closed one'), state: 'closed' },
      102: { number: 102, title: 'a PR', state: 'open', labels: [], pull_request: {} },
      103: {
        number: 103,
        title: 'an enhancement',
        state: 'open',
        labels: [{ name: 'enhancement' }],
      },
      104: failedTestIssue(104, 'eligible'),
    },
  });

  const result = await linkIssuesToFixPr({
    github,
    prNumber: 200,
    issueNumbers: [101, 102, 103, 104, 999],
  });

  assert.deepEqual(result.added, [104]);
  assert.deepEqual(
    result.skipped.map(({ number }) => number),
    [101, 102, 103, 999]
  );
  assert.deepEqual(
    github.created.map(({ issue_number: number }) => number),
    [104]
  );
});

test('linkIssuesToFixPr does not re-add a reference the body already carries', async () => {
  const pr = {
    number: 200,
    title: 'fix',
    state: 'open',
    merged: false,
    body: 'Fixes #100\nFixes #101',
  };
  const github = fakeGithub({ pr, issues: { 101: failedTestIssue(101, 'already linked') } });

  const result = await linkIssuesToFixPr({ github, prNumber: 200, issueNumbers: [101] });

  assert.deepEqual(result.added, []);
  assert.equal(github.updates.length, 0);
  // Still worth telling the issue about the PR that closes it.
  assert.deepEqual(result.notified, [101]);
});

test('linkIssuesToFixPr comments once per PR, even across re-runs', async () => {
  const pr = { number: 200, title: 'fix', state: 'open', merged: false, body: 'Fixes #100' };
  const github = fakeGithub({
    pr,
    issues: { 101: failedTestIssue(101, 'already notified') },
    comments: { 101: [{ body: 'earlier notice\n<!-- flaky-fix-linked-to-pr:200 -->' }] },
  });

  const result = await linkIssuesToFixPr({ github, prNumber: 200, issueNumbers: [101] });

  assert.deepEqual(result.notified, []);
  assert.equal(github.created.length, 0);
});

test('linkIssuesToFixPr leaves a merged PR body alone but still notifies the issue', async () => {
  const pr = { number: 200, title: 'fix', state: 'closed', merged: true, body: 'Fixes #100' };
  const github = fakeGithub({ pr, issues: { 101: failedTestIssue(101, 'late arrival') } });

  const result = await linkIssuesToFixPr({ github, prNumber: 200, issueNumbers: [101] });

  assert.deepEqual(result.added, [101]);
  assert.equal(github.updates.length, 0);
  assert.match(github.created[0].body, /has already merged/);
});

test('linkIssuesToFixPr honors notifyIssues: false', async () => {
  const pr = { number: 200, title: 'fix', state: 'open', merged: false, body: 'Fixes #100' };
  const github = fakeGithub({ pr, issues: { 101: failedTestIssue(101, 'quiet') } });

  const result = await linkIssuesToFixPr({
    github,
    prNumber: 200,
    issueNumbers: [101],
    notifyIssues: false,
  });

  assert.deepEqual(result.added, [101]);
  assert.deepEqual(result.notified, []);
  assert.equal(github.created.length, 0);
});

test('linkIssuesToFixPr caps how many issues one fix can claim', async () => {
  const numbers = Array.from({ length: 30 }, (_, index) => 300 + index);
  const pr = { number: 200, title: 'fix', state: 'open', merged: false, body: 'Fixes #100' };
  const github = fakeGithub({
    pr,
    issues: Object.fromEntries(numbers.map((number) => [number, failedTestIssue(number, 'spec')])),
  });

  const result = await linkIssuesToFixPr({ github, prNumber: 200, issueNumbers: numbers });

  assert.equal(result.added.length, 25);
  assert.equal(result.skipped.length, 5);
});
