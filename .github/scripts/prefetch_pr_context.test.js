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

const { filterTrustedComments } = require('./prefetch_pr_context');

const comment = (login, association) => ({
  id: `${login}-${association}`,
  user: login ? { login } : null,
  author_association: association,
});

test('keeps members, bots and the PR author; drops everyone else', () => {
  const comments = [
    comment('kibanamachine', 'MEMBER'),
    comment('maintainer', 'OWNER'),
    comment('collaborator', 'COLLABORATOR'),
    comment('infra-vault-gh-plugin-prod[bot]', 'CONTRIBUTOR'),
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
    'collaborator',
    'infra-vault-gh-plugin-prod[bot]',
    'pr-author',
  ]);
});
