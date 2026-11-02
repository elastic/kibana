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
//   node --test .github/scripts/release_note_team_label_comment.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const run = require('./release_note_team_label_comment');

const MARKER = '<!-- release-note-team-label-comment -->';
const STALE_COMMENT = { id: 99, body: `old nudge\n\n${MARKER}` };

const labels = (...names) => names.map((name) => ({ name }));

const createGithub = ({ comments }) => {
  const calls = { created: [], updated: [], deleted: [] };
  const github = {
    rest: {
      issues: {
        listComments: async () => ({ data: comments }),
        createComment: async ({ body }) => calls.created.push(body),
        updateComment: async ({ comment_id: id, body }) => calls.updated.push({ id, body }),
        deleteComment: async ({ comment_id: id }) => calls.deleted.push(id),
      },
    },
  };
  return { github, calls };
};

const makeContext = (labelNames) => ({
  repo: { owner: 'elastic', repo: 'kibana' },
  issue: { number: 7 },
  payload: {
    pull_request: {
      number: 7,
      labels: labels(...labelNames),
      user: { login: 'dev' },
    },
  },
});

test('does nothing when release_note:skip is the only release_note label', async () => {
  const { github, calls } = createGithub({ comments: [] });
  await run({ github, context: makeContext(['release_note:skip']) });
  assert.deepEqual(calls, { created: [], updated: [], deleted: [] });
});

test('does nothing when no release_note label is present', async () => {
  const { github, calls } = createGithub({ comments: [] });
  await run({ github, context: makeContext(['bug', 'Team:Core']) });
  assert.deepEqual(calls, { created: [], updated: [], deleted: [] });
});

test('creates a comment when non-skip release_note label is present and no category label exists', async () => {
  const { github, calls } = createGithub({ comments: [] });
  await run({ github, context: makeContext(['release_note:fix']) });
  assert.equal(calls.created.length, 1);
  assert.match(calls.created[0], /@dev/);
  assert.match(calls.created[0], /Team:\*.*Feature:\*/s);
  assert.ok(calls.created[0].includes(MARKER));
  assert.deepEqual(calls.updated, []);
  assert.deepEqual(calls.deleted, []);
});

test('updates the stale comment instead of creating a new one', async () => {
  const { github, calls } = createGithub({ comments: [STALE_COMMENT] });
  await run({ github, context: makeContext(['release_note:feature']) });
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.updated[0].id, STALE_COMMENT.id);
  assert.ok(calls.updated[0].body.includes(MARKER));
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.deleted, []);
});

test('deletes the stale comment when a Team: label is added', async () => {
  const { github, calls } = createGithub({ comments: [STALE_COMMENT] });
  await run({ github, context: makeContext(['release_note:fix', 'Team:Core']) });
  assert.deepEqual(calls.deleted, [STALE_COMMENT.id]);
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
});

test('deletes the stale comment when label changes to release_note:skip', async () => {
  const { github, calls } = createGithub({ comments: [STALE_COMMENT] });
  await run({ github, context: makeContext(['release_note:skip']) });
  assert.deepEqual(calls.deleted, [STALE_COMMENT.id]);
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
});
