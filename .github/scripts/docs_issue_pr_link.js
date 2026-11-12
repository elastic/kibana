/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Posts the Kibana PR link and "what changed for docs" notes on the docs issue
// that a developer linked in the PR description. PR text is untrusted: it is
// only parsed here, never run, and the target repo must be on an allowlist.

const MARKER = '<!-- docs-issue-pr-link -->';
const TEAM_LABEL = 'Team:Cases';
const ALLOW_LABEL = 'docs-issue:allow';
const DONE_LABEL = 'docs-issue:linked';
const TRUSTED_ASSOCIATIONS = ['MEMBER', 'OWNER'];
const MAX_NOTES_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;

// The private docs repo is not named yet, so only the public docs repo is allowed.
const ALLOWED_DOCS_REPOS = ['elastic/docs-content'];

const ISSUE_URL_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/(\d+)$/;

const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

// Stops @mentions and #123 references in copied text from pinging people or
// cross-linking issues in the docs repo.
const ZERO_WIDTH_SPACE = '\u200b';

const neutralize = (text) =>
  text.replace(/@/g, `@${ZERO_WIDTH_SPACE}`).replace(/#(\d+)/g, `#${ZERO_WIDTH_SPACE}$1`);

const hasLabel = (labels, name) => labels.some((label) => label.name === name);

/**
 * Reads the docs section of a PR description.
 * Returns { requested: false } when the docs box is not ticked, otherwise
 * { requested: true, ok, ... } with either the parsed request or an error.
 */
const parseDocsRequest = (body) => {
  const text = stripComments(body || '');
  if (!/^[-*] \[[xX]\] .*Update docs issue/m.test(text)) {
    return { requested: false };
  }

  const linkMatch = text.match(/^Docs issue:[ \t]*(\S*)[ \t]*$/m);
  const link = linkMatch ? linkMatch[1] : '';
  if (!link) {
    return { requested: true, ok: false, error: 'The "Docs issue" line has no link.' };
  }

  const urlMatch = link.match(ISSUE_URL_PATTERN);
  if (!urlMatch) {
    return {
      requested: true,
      ok: false,
      error:
        'The docs issue link must look like `https://github.com/<owner>/<repo>/issues/<number>`.',
    };
  }

  const [, repo, number] = urlMatch;
  if (!ALLOWED_DOCS_REPOS.includes(repo)) {
    return {
      requested: true,
      ok: false,
      error: `Docs issues must be in one of these repositories: ${ALLOWED_DOCS_REPOS.map(
        (allowed) => `\`${allowed}\``
      ).join(', ')}.`,
    };
  }

  const notesStart = text.search(/^What changed for docs:/m);
  const notes =
    notesStart === -1
      ? ''
      : text
          .slice(notesStart)
          .replace(/^What changed for docs:/, '')
          .split(/^#{1,6} /m)[0]
          .trim();
  if (!notes) {
    return { requested: true, ok: false, error: 'The "What changed for docs" notes are empty.' };
  }

  return {
    requested: true,
    ok: true,
    repo,
    issueNumber: Number(number),
    notes: neutralize(notes.slice(0, MAX_NOTES_LENGTH)),
  };
};

const isTrustedAuthor = ({ pr }) =>
  TRUSTED_ASSOCIATIONS.includes(pr.author_association) || hasLabel(pr.labels, ALLOW_LABEL);

const findMarkerComment = async ({ github, context, pr }) => {
  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pr.number,
    per_page: 100,
  });
  return comments.find((comment) => comment.body && comment.body.includes(MARKER));
};

const upsertPrComment = async ({ github, context, pr, existing, body }) => {
  const { owner, repo } = context.repo;
  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body });
  }
};

/**
 * Runs with the built-in token, before any docs-repo token is requested.
 * Sets the `proceed` output to 'true' only when the PR is safe to post.
 */
const validate = async ({ github, context, core }) => {
  const pr = context.payload.pull_request;
  core.setOutput('proceed', 'false');

  if (!hasLabel(pr.labels, TEAM_LABEL) || hasLabel(pr.labels, DONE_LABEL)) {
    return;
  }

  const request = parseDocsRequest(pr.body);
  if (!request.requested) {
    return;
  }

  const existing = await findMarkerComment({ github, context, pr });
  const problem = !isTrustedAuthor({ pr })
    ? `Only Elastic organization members can use this. A maintainer can add the \`${ALLOW_LABEL}\` label to allow it.`
    : !request.ok && request.error;

  if (problem) {
    await upsertPrComment({
      github,
      context,
      pr,
      existing,
      body: `@${pr.user.login}, the docs issue was not updated. ${problem}\n\n${MARKER}`,
    });
    return;
  }

  if (existing) {
    await github.rest.issues.deleteComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
    });
  }
  core.setOutput('proceed', 'true');
};

/**
 * Runs with the docs-repo token, after `validate` approved the PR. The parsed
 * request is read again from the same event payload, so nothing crosses steps.
 */
const postToDocsIssue = async ({ github, docsGithub, context }) => {
  const pr = context.payload.pull_request;
  const request = parseDocsRequest(pr.body);
  if (!request.ok) {
    throw new Error('postToDocsIssue ran without a valid docs request');
  }

  const [docsOwner, docsRepo] = request.repo.split('/');
  const title = neutralize(pr.title.slice(0, MAX_TITLE_LENGTH));
  await docsGithub.rest.issues.createComment({
    owner: docsOwner,
    repo: docsRepo,
    issue_number: request.issueNumber,
    body: [
      `Kibana PR: ${pr.html_url}`,
      `Title: ${title}`,
      '',
      '**What changed for docs**',
      '',
      request.notes.replace(/^/gm, '> '),
      '',
      `<!-- kibana-pr:${pr.number} -->`,
    ].join('\n'),
  });

  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: pr.number,
    labels: [DONE_LABEL],
  });
};

module.exports = { parseDocsRequest, validate, postToDocsIssue };
