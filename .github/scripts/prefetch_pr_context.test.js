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
//   node --test .github/scripts/prefetch_pr_context.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { filterTrustedComments, getLinkedIssueComments } = require('./prefetch_pr_context');

const comment = (login, association) => ({
  id: `${login}-${association}`,
  user: login ? { login } : null,
  author_association: association,
});

test('keeps members, known bots and the PR author; drops everyone else', () => {
  const comments = [
    comment('kibanamachine', 'MEMBER'),
    comment('maintainer', 'OWNER'),
    comment('collaborator', 'COLLABORATOR'),
    comment('infra-vault-gh-plugin-prod[bot]', 'CONTRIBUTOR'),
    comment('github-actions[bot]', 'CONTRIBUTOR'),
    comment('any-installed-app[bot]', 'NONE'),
    comment('pr-author', 'CONTRIBUTOR'),
    comment('drive-by', 'NONE'),
    comment('past-contributor', 'CONTRIBUTOR'),
    comment('first-timer', 'FIRST_TIME_CONTRIBUTOR'),
    comment(null, 'MEMBER'),
  ];

  const kept = filterTrustedComments({ comments, prAuthorLogin: 'pr-author' }).map(
    ({ user }) => user.login
  );

  assert.deepEqual(kept, [
    'kibanamachine',
    'maintainer',
    'infra-vault-gh-plugin-prod[bot]',
    'github-actions[bot]',
    'pr-author',
  ]);
});

const listCommentsRef = 'issues.listComments';
const listFilesRef = 'pulls.listFiles';
const listReviewsRef = 'pulls.listReviews';

const coreStub = () => ({ info() {}, warning() {} });

const sameRepoIssue = (number) => ({
  number,
  repository: { owner: { login: 'elastic' }, name: 'kibana' },
});

// github.paginate(fn, params) stub: files/reviews are empty; issue comments come from the map,
// and listed failIssues throw to exercise the per-issue isolation.
const makeGithub = ({ closingIssues, issueComments = {}, failIssues = new Set() }) => ({
  graphql: async (query) => {
    if (query.includes('closingIssuesReferences')) {
      return {
        repository: {
          pullRequest: {
            number: 100,
            title: 't',
            body: 'b',
            url: 'u',
            isDraft: true,
            author: { __typename: 'User', login: 'kibanamachine', id: 'u1', name: '' },
            baseRefName: 'main',
            headRefName: 'fix',
            labels: { nodes: [] },
            mergeCommit: null,
            mergedAt: null,
            state: 'OPEN',
            closingIssuesReferences: { nodes: closingIssues },
            timelineItems: { nodes: [] },
          },
        },
      };
    }
    if (query.includes('reviewThreads')) {
      return {
        repository: {
          pullRequest: { reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } } },
        },
      };
    }
    throw new Error(`unexpected graphql query: ${query.slice(0, 40)}`);
  },
  paginate: async (fn, params) => {
    if (fn === listFilesRef || fn === listReviewsRef) {
      return [];
    }
    if (fn === listCommentsRef) {
      if (params.issue_number === 100) {
        return [];
      }
      if (failIssues.has(params.issue_number)) {
        throw new Error(`boom #${params.issue_number}`);
      }
      return issueComments[params.issue_number] ?? [];
    }
    throw new Error('unexpected paginate target');
  },
  rest: {
    issues: { listComments: listCommentsRef },
    pulls: { listFiles: listFilesRef, listReviews: listReviewsRef },
  },
});

test('getLinkedIssueComments fetches each requested issue, filters, and isolates failures', async () => {
  const requested = [];
  const github = {
    paginate: async (_fn, params) => {
      requested.push(params.issue_number);
      if (params.issue_number === 11) {
        throw new Error('rate limited');
      }
      return [comment('maintainer', 'OWNER'), comment('drive-by', 'NONE')];
    },
    rest: { issues: { listComments: listCommentsRef } },
  };

  const result = await getLinkedIssueComments({
    github,
    core: coreStub(),
    owner: 'elastic',
    repo: 'kibana',
    issueNumbers: [10, 11],
  });

  assert.deepEqual(requested, [10, 11]);
  assert.deepEqual(
    result.map(({ number }) => number),
    [10, 11]
  );
  assert.deepEqual(
    result[0].comments.map(({ user }) => user.login),
    ['maintainer']
  );
  // A failed fetch yields empty comments rather than rejecting the whole prefetch.
  assert.deepEqual(result[1], { number: 11, comments: [] });
});

test('prefetchPrContext keeps only same-repo closing issues and still writes core artifacts when a linked issue fails', async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-context-'));
  const github = makeGithub({
    closingIssues: [
      sameRepoIssue(10),
      { number: 999, repository: { owner: { login: 'elastic' }, name: 'other-repo' } },
      sameRepoIssue(11),
    ],
    issueComments: { 10: [comment('maintainer', 'OWNER'), comment('drive-by', 'NONE')] },
    failIssues: new Set([11]),
  });

  const { prefetchPrContext } = require('./prefetch_pr_context');
  await prefetchPrContext({
    github,
    core: coreStub(),
    outputDir,
    repoFullName: 'elastic/kibana',
    pullNumber: 100,
  });

  const read = (name) => JSON.parse(fs.readFileSync(path.join(outputDir, name), 'utf8'));

  // Cross-repo issue #999 is dropped; the number-only REST lookup never runs for it.
  assert.deepEqual(read('pr-metadata.json').closingIssues, [10, 11]);

  const linked = read('linked-issue-comments.json');
  assert.deepEqual(
    linked.map(({ number }) => number),
    [10, 11]
  );
  assert.deepEqual(
    linked.find(({ number }) => number === 10).comments.map(({ user }) => user.login),
    ['maintainer']
  );
  assert.deepEqual(linked.find(({ number }) => number === 11).comments, []);

  // Core artifacts are written even though issue #11's fetch failed.
  for (const name of [
    'pr-metadata.json',
    'pr-issue-comments.json',
    'pr-review-comments.json',
    'pr-reviews.json',
  ]) {
    assert.ok(fs.existsSync(path.join(outputDir, name)), `${name} should exist`);
  }
  assert.ok(fs.existsSync(path.join(outputDir, 'pr-diff.txt')), 'pr-diff.txt should exist');
});
