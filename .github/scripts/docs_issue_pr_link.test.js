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
//   node --test .github/scripts/docs_issue_pr_link.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseDocsRequest, validate, postToDocsIssue } = require('./docs_issue_pr_link');

const MARKER = '<!-- docs-issue-pr-link -->';
const DOCS_ISSUE = 'https://github.com/elastic/docs-content/issues/42';

const makeBody = ({
  ticked = true,
  link = DOCS_ISSUE,
  notes = 'The case template picker moved to the toolbar.',
} = {}) =>
  [
    '## Summary',
    'Moves the picker.',
    '',
    '### Documentation',
    '',
    `- [${ticked ? 'x' : ' '}] Update docs issue`,
    '',
    `Docs issue: ${link}`,
    '',
    `What changed for docs: ${notes}`,
    '',
    '### Identify risks',
    'None.',
  ].join('\n');

const labels = (...names) => names.map((name) => ({ name }));

const makePr = ({
  body = makeBody(),
  labelNames = ['Team:Cases'],
  association = 'MEMBER',
  title = 'Move the picker',
} = {}) => ({
  number: 7,
  title,
  body,
  html_url: 'https://github.com/elastic/kibana/pull/7',
  labels: labels(...labelNames),
  author_association: association,
  user: { login: 'dev' },
});

const makeContext = (pr) => ({
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: { pull_request: pr },
});

const createGithub = ({ comments = [] } = {}) => {
  const calls = { created: [], updated: [], deleted: [], labeled: [], docsComments: [] };
  const github = {
    rest: {
      issues: {
        listComments: async () => ({ data: comments }),
        createComment: async ({ body }) => calls.created.push(body),
        updateComment: async ({ comment_id: id, body }) => calls.updated.push({ id, body }),
        deleteComment: async ({ comment_id: id }) => calls.deleted.push(id),
        addLabels: async ({ labels: added }) => calls.labeled.push(...added),
      },
    },
  };
  const docsGithub = {
    rest: {
      issues: {
        createComment: async (args) => calls.docsComments.push(args),
      },
    },
  };
  return { github, docsGithub, calls };
};

const createCore = () => {
  const outputs = {};
  return { outputs, setOutput: (key, value) => (outputs[key] = value) };
};

const runValidate = async (prOptions, githubOptions) => {
  const { github, calls } = createGithub(githubOptions);
  const core = createCore();
  await validate({ github, context: makeContext(makePr(prOptions)), core });
  return { calls, proceed: core.outputs.proceed };
};

test('parseDocsRequest ignores a PR whose docs box is not ticked', () => {
  assert.deepEqual(parseDocsRequest(makeBody({ ticked: false })), { requested: false });
});

test('parseDocsRequest ignores a ticked box that only appears inside an HTML comment', () => {
  const body = `<!-- - [x] Update docs issue -->\nDocs issue: ${DOCS_ISSUE}`;
  assert.deepEqual(parseDocsRequest(body), { requested: false });
});

test('parseDocsRequest returns the repo, issue number and notes for a valid request', () => {
  assert.deepEqual(parseDocsRequest(makeBody()), {
    requested: true,
    ok: true,
    repo: 'elastic/docs-content',
    issueNumber: 42,
    notes: 'The case template picker moved to the toolbar.',
  });
});

test('parseDocsRequest keeps multi-line notes and stops at the next heading', () => {
  const { notes } = parseDocsRequest(makeBody({ notes: 'Line one.\nLine two.' }));
  assert.equal(notes, 'Line one.\nLine two.');
});

test('parseDocsRequest rejects links to repositories outside the allowlist', () => {
  // A link to Kibana or security-team must never get a docs-repo token.
  for (const repo of ['elastic/kibana', 'elastic/security-team', 'someone/docs-content']) {
    const result = parseDocsRequest(makeBody({ link: `https://github.com/${repo}/issues/1` }));
    assert.equal(result.ok, false, repo);
    assert.match(result.error, /must be in one of these repositories/);
  }
});

test('parseDocsRequest rejects malformed links', () => {
  const links = [
    'https://github.com/elastic/docs-content/pull/42',
    'https://github.com/elastic/docs-content/issues/42/extra',
    'https://github.com.evil.example/elastic/docs-content/issues/42',
    'http://github.com/elastic/docs-content/issues/42',
    '#42',
  ];
  for (const link of links) {
    const result = parseDocsRequest(makeBody({ link }));
    assert.equal(result.ok, false, link);
    assert.match(result.error, /must look like/);
  }
});

test('parseDocsRequest reports a missing link and missing notes', () => {
  assert.match(parseDocsRequest(makeBody({ link: '' })).error, /has no link/);
  assert.match(parseDocsRequest(makeBody({ notes: '' })).error, /notes are empty/);
});

test('parseDocsRequest neutralizes mentions and issue references in the notes', () => {
  const { notes } = parseDocsRequest(
    makeBody({ notes: 'Ask @someone about #123 and elastic/kibana#9.' })
  );
  assert.ok(!notes.includes('@someone'));
  assert.ok(!notes.includes('#123'));
  assert.ok(!notes.includes('kibana#9'));
  assert.match(notes, /@​someone/);
});

test('parseDocsRequest caps the notes length', () => {
  const { notes } = parseDocsRequest(makeBody({ notes: 'a'.repeat(5000) }));
  assert.equal(notes.length, 2000);
});

test('validate does nothing for PRs without the Team:Cases label', async () => {
  const { calls, proceed } = await runValidate({ labelNames: ['Team:Core'] });
  assert.equal(proceed, 'false');
  assert.deepEqual(calls.created, []);
});

test('validate does nothing when the docs box is not ticked', async () => {
  const { calls, proceed } = await runValidate({ body: makeBody({ ticked: false }) });
  assert.equal(proceed, 'false');
  assert.deepEqual(calls.created, []);
});

test('validate does nothing for a PR that is already linked', async () => {
  const { calls, proceed } = await runValidate({ labelNames: ['Team:Cases', 'docs-issue:linked'] });
  assert.equal(proceed, 'false');
  assert.deepEqual(calls.created, []);
});

test('validate approves a trusted author with a valid request', async () => {
  const { calls, proceed } = await runValidate();
  assert.equal(proceed, 'true');
  assert.deepEqual(calls.created, []);
});

test('validate blocks an author outside the organization and explains why', async () => {
  const { calls, proceed } = await runValidate({ association: 'CONTRIBUTOR' });
  assert.equal(proceed, 'false');
  assert.equal(calls.created.length, 1);
  assert.match(calls.created[0], /docs-issue:allow/);
  assert.ok(calls.created[0].includes(MARKER));
});

test('validate lets a maintainer allow an outside author with the allow label', async () => {
  const { proceed } = await runValidate({
    association: 'CONTRIBUTOR',
    labelNames: ['Team:Cases', 'docs-issue:allow'],
  });
  assert.equal(proceed, 'true');
});

test('validate comments once and stops on an invalid link', async () => {
  const { calls, proceed } = await runValidate({
    body: makeBody({ link: 'https://github.com/elastic/kibana/issues/1' }),
  });
  assert.equal(proceed, 'false');
  assert.equal(calls.created.length, 1);
  assert.match(calls.created[0], /@dev/);
  assert.match(calls.created[0], /must be in one of these repositories/);
});

test('validate updates its earlier comment instead of adding another', async () => {
  const existing = { id: 99, body: `old\n\n${MARKER}` };
  const { calls } = await runValidate({ body: makeBody({ link: '' }) }, { comments: [existing] });
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.updated[0].id, 99);
  assert.deepEqual(calls.created, []);
});

test('validate removes its earlier comment once the request is valid', async () => {
  const existing = { id: 99, body: `old\n\n${MARKER}` };
  const { calls, proceed } = await runValidate({}, { comments: [existing] });
  assert.equal(proceed, 'true');
  assert.deepEqual(calls.deleted, [99]);
});

test('postToDocsIssue comments on the docs issue and labels the PR', async () => {
  const { github, docsGithub, calls } = createGithub();
  await postToDocsIssue({ github, docsGithub, context: makeContext(makePr()) });

  assert.equal(calls.docsComments.length, 1);
  const [comment] = calls.docsComments;
  assert.equal(comment.owner, 'elastic');
  assert.equal(comment.repo, 'docs-content');
  assert.equal(comment.issue_number, 42);
  assert.match(comment.body, /https:\/\/github\.com\/elastic\/kibana\/pull\/7/);
  assert.match(comment.body, /> The case template picker moved to the toolbar\./);
  assert.deepEqual(calls.labeled, ['docs-issue:linked']);
});

test('postToDocsIssue neutralizes the PR title', async () => {
  const { github, docsGithub, calls } = createGithub();
  const pr = makePr({ title: 'Fix #5 for @someone' });
  await postToDocsIssue({ github, docsGithub, context: makeContext(pr) });
  assert.ok(!calls.docsComments[0].body.includes('@someone'));
  assert.ok(!calls.docsComments[0].body.includes('#5'));
});

test('postToDocsIssue refuses to post an invalid request and writes nothing', async () => {
  const { github, docsGithub, calls } = createGithub();
  const pr = makePr({ body: makeBody({ link: 'https://github.com/elastic/kibana/issues/1' }) });
  await assert.rejects(postToDocsIssue({ github, docsGithub, context: makeContext(pr) }));
  assert.deepEqual(calls.docsComments, []);
  assert.deepEqual(calls.labeled, []);
});
