/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MARKER = '<!-- release-note-team-label-comment -->';

const hasNonSkipReleaseNote = (labels) =>
  labels.some(({ name }) => name.startsWith('release_note:') && name !== 'release_note:skip');

const hasCategoryLabel = (labels) =>
  labels.some(({ name }) => name.startsWith('Team:') || name.startsWith('Feature:'));

module.exports = async ({ github, context }) => {
  const pr = context.payload.pull_request;
  const labels = pr.labels;
  const needsComment = hasNonSkipReleaseNote(labels) && !hasCategoryLabel(labels);

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pr.number,
    per_page: 100,
  });
  const existing = comments.find((c) => c.body && c.body.includes(MARKER));

  if (!needsComment) {
    if (existing) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existing.id,
      });
    }
    return;
  }

  const body =
    `@${pr.user.login}, this PR has a \`release_note:*\` label that will include it in the release notes, ` +
    `but it's missing a \`Feature:*\` label needed to categorize the entry.\n\n` +
    `Please add the appropriate \`Team:*\` or \`Feature:*\` label so the release note can be filed under the right section. ` +
    `You can browse available labels at https://github.com/elastic/kibana/labels.\n\n` +
    `${MARKER}`;

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      issue_number: pr.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body,
    });
  }
};
