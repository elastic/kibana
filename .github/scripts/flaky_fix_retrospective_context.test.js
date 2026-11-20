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
//   node --test .github/scripts/flaky_fix_retrospective_context.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  OUTCOMES,
  automationClosureOutcome,
  classifyCommits,
  classifyDidNotHoldIssue,
  classifyPullRequest,
  findClosingComment,
  linkedIssuesFromBody,
  numbersInText,
  parseCiData,
} = require('./flaky_fix_retrospective_context');

const commit = ({ sha, login, name, parents = 1, date = '2026-10-01T00:00:00Z' }) => ({
  sha,
  author: login ? { login } : null,
  commit: { author: { name, date }, message: `commit ${sha}` },
  parents: Array.from({ length: parents }, (_, index) => ({ sha: `parent-${index}` })),
});

test('classifyCommits separates developer commits from the automation and finds the proposal head', () => {
  const { all, human, agentHeadSha } = classifyCommits([
    commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' }),
    commit({ sha: 'a2', login: null, name: 'github-actions[bot]' }),
    commit({ sha: 'h1', login: 'developer', name: 'A Developer' }),
    commit({ sha: 'm1', login: 'developer', name: 'A Developer', parents: 2 }),
    commit({ sha: 'a3', login: 'kibanamachine', name: 'Kibana Machine' }),
  ]);

  assert.equal(all.length, 5);
  assert.deepEqual(
    human.map(({ sha }) => sha),
    ['h1']
  );
  assert.equal(agentHeadSha, 'a2');
});

test('classifyCommits treats Copilot commits as developer-directed changes', () => {
  const { human } = classifyCommits([
    commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' }),
    commit({ sha: 'c1', login: 'Copilot', name: 'copilot-swe-agent[bot]' }),
  ]);
  assert.deepEqual(
    human.map(({ sha }) => sha),
    ['c1']
  );
});

test('classifyCommits falls back to the first commit when the branch only has bot commits', () => {
  const { human, agentHeadSha } = classifyCommits([
    commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' }),
    commit({ sha: 'a2', login: 'kibanamachine', name: 'Kibana Machine' }),
  ]);
  assert.equal(human.length, 0);
  assert.equal(agentHeadSha, 'a2');
});

test('linkedIssuesFromBody and numbersInText extract references', () => {
  assert.deepEqual(linkedIssuesFromBody('Fixes #123\nCloses #45 and fixes #123'), [123, 45]);
  assert.deepEqual(
    numbersInText(
      'Superseded by #301801 (https://github.com/elastic/kibana/pull/301802), see /issues/7'
    ),
    [301801, 301802, 7]
  );
});

test('parseCiData reads the reporter metadata from the issue body', () => {
  const body =
    'Failing test\n<!-- kibanaCiData = {"failed-test":{"test.class":"Jest Tests.x","test.name":"renders","test.failCount":2,"test.type":"jest"}} -->';
  assert.deepEqual(parseCiData(body), {
    'test.class': 'Jest Tests.x',
    'test.name': 'renders',
    'test.failCount': 2,
    'test.type': 'jest',
  });
  assert.equal(parseCiData('no metadata'), null);
});

test('findClosingComment prefers the closer comment nearest to the close event', () => {
  const comments = [
    { id: 1, user: 'dev', created_at: '2026-10-01T10:00:00Z', body: 'early thought' },
    { id: 2, user: 'other', created_at: '2026-10-02T09:59:00Z', body: 'someone else' },
    { id: 3, user: 'dev', created_at: '2026-10-02T09:58:00Z', body: 'closing because superseded' },
  ];
  assert.equal(
    findClosingComment({ comments, closer: 'dev', closedAt: '2026-10-02T10:00:00Z' }).id,
    3
  );
  assert.equal(
    findClosingComment({ comments, closer: 'dev', closedAt: '2026-10-09T10:00:00Z' }).id,
    3
  );
  assert.equal(
    findClosingComment({ comments, closer: 'nobody', closedAt: '2026-10-02T10:00:00Z' }),
    null
  );
});

test('automationClosureOutcome tells verifier duplicates from stale sweeps', () => {
  assert.equal(
    automationClosureOutcome({
      body: '### 🔁 Closing as a duplicate fix\n\nThis PR fixes the same flaky test as #1',
    }),
    OUTCOMES.duplicate
  );
  assert.equal(
    automationClosureOutcome({ body: 'closed after 21 days <!-- stale-auto-close-closed -->' }),
    OUTCOMES.stale
  );
  assert.equal(automationClosureOutcome(null), OUTCOMES.stale);
});

const fixerPr = (overrides = {}) => ({
  number: 100,
  title: '[Area] Fix',
  html_url: 'https://github.com/elastic/kibana/pull/100',
  user: { login: 'kibanamachine' },
  state: 'closed',
  merged: true,
  merged_at: '2026-10-05T00:00:00Z',
  merged_by: { login: 'reviewer' },
  closed_at: '2026-10-05T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  merge_commit_sha: 'merge',
  base: { ref: 'main' },
  labels: [{ name: 'flaky-test-fixer' }, { name: 'flaky-fix-check:passed' }],
  body: 'Fixes #42',
  ...overrides,
});

// A partial Octokit with only the calls classifyPullRequest makes. `paginate` just invokes the
// mocked endpoint, which returns the whole fixture list.
const createGithub = ({ pr, commits, comments = [], reviews = [] }) => {
  const github = {
    paginate: async (method, parameters) => method(parameters),
    graphql: async () => ({
      repository: { pullRequest: { timelineItems: { nodes: [] } } },
    }),
    rest: {
      pulls: {
        get: async () => ({ data: pr }),
        listCommits: async () => commits,
        listFiles: async () => [
          { filename: 'a.ts', status: 'modified', patch: '@@ -1 +1 @@\n-a\n+b' },
        ],
        listReviews: async () => reviews,
      },
      issues: {
        listComments: async () => comments,
      },
    },
  };
  return { github };
};

const core = { info: () => {}, warning: () => {}, setOutput: () => {} };

test('classifyPullRequest skips PRs that are not fixer PRs', async () => {
  const { github } = createGithub({ pr: fixerPr({ user: { login: 'someone' } }), commits: [] });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.match(result.skip, /not a flaky-test-fixer PR/);
});

test('classifyPullRequest labels a merge without developer commits as merged-as-proposed and skips analysis', async () => {
  const { github } = createGithub({
    pr: fixerPr(),
    commits: [commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' })],
  });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.equal(result.outcome, OUTCOMES.mergedAsProposed);
  assert.equal(result.needsAnalysis, false);
  assert.equal(result.context.fixPr.developerCommits.length, 0);
});

// A closed, unmerged fixer PR whose closer mentions another PR. `replacementMergedAt` controls
// whether that PR counts as the replacement (it must have merged after the fixer opened its PR).
const createClosedFixture = ({
  replacementMergedAt,
  closer = 'dev',
  closingBody = 'Superseded by #200',
}) => {
  const pr = fixerPr({
    merged: false,
    merged_at: null,
    merged_by: null,
    closed_at: '2026-10-05T00:00:00Z',
  });
  const replacement = {
    ...fixerPr({
      number: 200,
      user: { login: 'dev' },
      labels: [],
      merged: true,
      merged_at: replacementMergedAt,
      body: '',
    }),
  };
  const comments = [
    {
      id: 1,
      user: { login: closer },
      author_association: 'MEMBER',
      created_at: '2026-10-05T00:00:00Z',
      body: closingBody,
    },
  ];
  const { github } = createGithub({
    pr,
    commits: [commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' })],
    comments,
  });
  github.rest.pulls.get = async (parameters) => ({
    data: parameters.pull_number === 200 ? replacement : pr,
  });
  github.graphql = async (query) =>
    query.includes('pullRequest(number')
      ? {
          repository: {
            pullRequest: {
              timelineItems: {
                nodes: [
                  {
                    createdAt: '2026-10-05T00:00:00Z',
                    // GraphQL reports a GitHub App without the `[bot]` suffix.
                    actor: closer.endsWith('[bot]')
                      ? { __typename: 'Bot', login: closer.slice(0, -'[bot]'.length) }
                      : { __typename: 'User', login: closer },
                  },
                ],
              },
            },
          },
        }
      : {
          repository: {
            issue: { closedByPullRequestsReferences: { nodes: [] }, timelineItems: { nodes: [] } },
          },
        };
  github.rest.issues.get = async () => ({
    data: {
      number: 42,
      title: 'Failing test',
      labels: [],
      body: '',
      user: { login: 'kibanamachine' },
    },
  });
  return github;
};

test('classifyPullRequest treats a later merged PR named in the closing comment as the replacement', async () => {
  const github = createClosedFixture({ replacementMergedAt: '2026-10-06T00:00:00Z' });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.equal(result.outcome, OUTCOMES.replaced);
  assert.equal(result.needsAnalysis, true);
  assert.deepEqual(
    result.context.replacementPrs.map(({ number }) => number),
    [200]
  );
});

test('classifyPullRequest ignores PRs merged before the fixer opened its PR', async () => {
  const github = createClosedFixture({ replacementMergedAt: '2026-09-01T00:00:00Z' });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.equal(result.outcome, OUTCOMES.closed);
  assert.equal(result.needsAnalysis, true);
  assert.equal(result.context.closingComment.body, 'Superseded by #200');
});

test('classifyPullRequest skips analysis for automation closures', async () => {
  const github = createClosedFixture({
    replacementMergedAt: '2026-10-06T00:00:00Z',
    closer: 'github-actions[bot]',
    closingBody: '### 🔁 Closing as a duplicate fix',
  });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.equal(result.outcome, OUTCOMES.duplicate);
  assert.equal(result.needsAnalysis, false);
});

test('classifyPullRequest asks for analysis when a reviewer requested changes even without commits', async () => {
  const { github } = createGithub({
    pr: fixerPr(),
    commits: [commit({ sha: 'a1', login: 'kibanamachine', name: 'Kibana Machine' })],
    reviews: [
      {
        user: { login: 'reviewer' },
        author_association: 'MEMBER',
        state: 'CHANGES_REQUESTED',
        body: 'no',
      },
    ],
  });
  github.rest.repos = {
    compareCommitsWithBasehead: async () => ({ data: { files: [] } }),
  };
  github.rest.issues.get = async () => ({
    data: { number: 42, title: 'Failing test', labels: [], body: '' },
  });
  const result = await classifyPullRequest({ github, core, pullNumber: 100 });
  assert.equal(result.outcome, OUTCOMES.revised);
  assert.equal(result.needsAnalysis, true);
});

test('classifyDidNotHoldIssue finds the prior fix through the issue history alone', async () => {
  const { github } = createGithub({ pr: fixerPr(), commits: [] });
  github.rest.issues.get = async () => ({
    data: {
      number: 42,
      title: 'Failing test: renders',
      html_url: 'https://github.com/elastic/kibana/issues/42',
      labels: [{ name: 'failed-test' }, { name: 'failure:fix-did-not-hold' }],
      body: '',
      user: { login: 'kibanamachine' },
    },
  });
  github.graphql = async () => ({
    repository: {
      issue: {
        closedByPullRequestsReferences: {
          nodes: [
            {
              number: 100,
              merged: true,
              mergedAt: '2026-10-05T00:00:00Z',
              author: { login: 'kibanamachine' },
              labels: { nodes: [{ name: 'flaky-test-fixer' }] },
            },
          ],
        },
        timelineItems: { nodes: [] },
      },
    },
  });
  const result = await classifyDidNotHoldIssue({
    github,
    core,
    issueNumber: 42,
    labeledAt: '2026-10-10T00:00:00Z',
  });
  assert.equal(result.outcome, OUTCOMES.didNotHold);
  assert.deepEqual(result.labelTargets, [100]);
});

test('classifyDidNotHoldIssue takes the label time from the timeline on a manual run', async () => {
  const { github } = createGithub({ pr: fixerPr(), commits: [] });
  github.rest.issues.get = async () => ({
    data: {
      number: 42,
      title: 'Failing test: renders',
      html_url: 'https://github.com/elastic/kibana/issues/42',
      labels: [{ name: 'failed-test' }, { name: 'failure:fix-did-not-hold' }],
      body: '',
      user: { login: 'kibanamachine' },
    },
  });
  const mergedFixer = (number, mergedAt) => ({
    number,
    merged: true,
    mergedAt,
    author: { login: 'kibanamachine' },
    labels: { nodes: [{ name: 'flaky-test-fixer' }] },
  });
  github.graphql = async () => ({
    repository: {
      issue: {
        closedByPullRequestsReferences: {
          // The replacement merged after the label went on: it is not the fix that failed.
          nodes: [
            mergedFixer(100, '2026-10-05T00:00:00Z'),
            mergedFixer(200, '2026-10-20T00:00:00Z'),
          ],
        },
        timelineItems: {
          nodes: [
            {
              __typename: 'LabeledEvent',
              createdAt: '2026-10-10T00:00:00Z',
              label: { name: 'failure:fix-did-not-hold' },
            },
          ],
        },
      },
    },
  });
  const result = await classifyDidNotHoldIssue({ github, core, issueNumber: 42 });
  assert.equal(result.outcome, OUTCOMES.didNotHold);
  assert.deepEqual(result.labelTargets, [100]);
});
