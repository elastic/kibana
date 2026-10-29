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
//   node --test .github/scripts/bundle_size_limits_comment.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const run = require('./bundle_size_limits_comment');

const LIMITS_PATH = 'packages/kbn-rspack-optimizer/limits.yml';
const MARKER = '<!-- bundle-size-limits-comment -->';
const STALE_COMMENT = { id: 42, body: `old warning\n\n${MARKER}` };

const limitsYml = (sizes) =>
  `pageLoadAssetSize:\n${Object.entries(sizes)
    .map(([plugin, size]) => `  ${plugin}: ${size}`)
    .join('\n')}\n`;

const createGithub = ({ files, contentByRef, comments }) => {
  const calls = { created: [], updated: [], deleted: [] };
  const github = {
    paginate: async () => files.map((filename) => ({ filename })),
    rest: {
      pulls: { listFiles: () => {} },
      repos: {
        getContent: async ({ ref }) => ({
          data: { content: Buffer.from(contentByRef[ref]).toString('base64') },
        }),
      },
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

const context = {
  repo: { owner: 'elastic', repo: 'kibana' },
  issue: { number: 1 },
  payload: {
    pull_request: {
      number: 1,
      base: { sha: 'base' },
      head: { sha: 'head' },
      user: { login: 'dev' },
    },
  },
};

test('deletes a stale comment when the PR no longer changes limits.yml against its base', async () => {
  // After a retarget, base and head can still differ in limits.yml content, but the
  // PR diff no longer includes the file. Those differences are not this PR's changes.
  const { github, calls } = createGithub({
    files: ['src/some_file.ts'],
    contentByRef: { base: limitsYml({ alertzero: 4489 }), head: limitsYml({ alertzero: 10276 }) },
    comments: [STALE_COMMENT],
  });

  await run({ github, context });

  assert.deepEqual(calls, { created: [], updated: [], deleted: [STALE_COMMENT.id] });
});

test('updates the existing comment when the PR raises a limit by 15% or more', async () => {
  const { github, calls } = createGithub({
    files: [LIMITS_PATH],
    contentByRef: { base: limitsYml({ alertzero: 1000 }), head: limitsYml({ alertzero: 1150 }) },
    comments: [STALE_COMMENT],
  });

  await run({ github, context });

  assert.equal(calls.deleted.length, 0);
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.updated[0].id, STALE_COMMENT.id);
  assert.match(calls.updated[0].body, /\| `alertzero` \| 1,000 \| 1,150 \| \+15\.0% \|/);
});
