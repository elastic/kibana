/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_OUTPUT_DIR = '/tmp/pr-context';
const DEFAULT_GRAPHQL_ATTEMPTS = 3;
const DEFAULT_GRAPHQL_RETRY_DELAY_MS = 1000;

const parseRepo = (repoFullName) => {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Expected REPO in owner/repo form, received: ${repoFullName}`);
  }

  return { owner, repo };
};

const writeJson = ({ outputDir, filename, value }) => {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = ({ outputDir, filename, value }) => {
  fs.writeFileSync(path.join(outputDir, filename), value);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const graphqlWithRetry = async ({
  github,
  query,
  variables,
  attempts = DEFAULT_GRAPHQL_ATTEMPTS,
  retryDelayMs = DEFAULT_GRAPHQL_RETRY_DELAY_MS,
}) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await github.graphql(query, variables);
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError;
};

const getBotAwareLogin = (author) => {
  if (!author) {
    return null;
  }

  if (author.__typename === 'Bot') {
    return `${author.login}[bot]`;
  }

  return author.login;
};

const buildPrDiffFromFiles = (files) =>
  `${files
    .map((file) => {
      const oldFilename = file.previous_filename ?? file.filename;
      const patch =
        file.patch ??
        '# GitHub did not provide a patch for this file. See pr-files.json for metadata.';

      return [`diff --git a/${oldFilename} b/${file.filename}`, patch].join('\n');
    })
    .join('\n')}\n`;

const withoutPatch = (file) => {
  const fileMetadata = { ...file };
  delete fileMetadata.patch;
  return fileMetadata;
};

const normalizeLabel = (label) => ({
  ...label,
  description: label.description ?? '',
});

const metadataQuery = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        number
        title
        body
        url
        isDraft
        author {
          __typename
          login
          ... on User {
            id
            name
          }
          ... on Bot {
            id
          }
        }
        baseRefName
        headRefName
        labels(first: 100) {
          nodes {
            id
            name
            description
            color
          }
        }
        mergeCommit {
          oid
        }
        mergedAt
        state
        timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
          nodes {
            ... on CrossReferencedEvent {
              source {
                ... on PullRequest {
                  number
                  url
                  state
                  baseRefName
                  title
                  labels(first: 50) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const reviewCommentFields = `
  id
  databaseId
  body
  author {
    __typename
    login
  }
  authorAssociation
  url
  createdAt
  updatedAt
  path
  position
  originalPosition
  diffHunk
  outdated
  commit {
    oid
  }
  originalCommit {
    oid
  }
  pullRequestReview {
    databaseId
    id
    state
    submittedAt
  }
  replyTo {
    id
    databaseId
  }
`;

const reviewThreadsQuery = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            startLine
            originalLine
            originalStartLine
            diffSide
            startDiffSide
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const reviewThreadCommentsQuery = `
  query($threadId: ID!, $cursor: String) {
    node(id: $threadId) {
      ... on PullRequestReviewThread {
        comments(first: 100, after: $cursor) {
          nodes {
            ${reviewCommentFields}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

const getPrMetadata = async ({ github, owner, repo, pullNumber }) => {
  const result = await graphqlWithRetry({
    github,
    query: metadataQuery,
    variables: {
      owner,
      repo,
      number: pullNumber,
    },
  });
  const pullRequest = result.repository.pullRequest;
  const author = pullRequest.author;
  const crossReferencedPulls = pullRequest.timelineItems.nodes
    .map((node) => node.source)
    .filter((source) => source?.number)
    .map((source) => ({
      number: source.number,
      url: source.url,
      state: source.state,
      baseRefName: source.baseRefName,
      title: source.title,
      labels: source.labels.nodes.map((label) => label.name),
    }));

  return {
    author: author
      ? {
          id: author.id,
          is_bot: author.__typename === 'Bot',
          login: author.login,
          name: author.name ?? '',
        }
      : null,
    baseRefName: pullRequest.baseRefName,
    body: pullRequest.body,
    headRefName: pullRequest.headRefName,
    isDraft: pullRequest.isDraft,
    labels: pullRequest.labels.nodes.map(normalizeLabel),
    mergeCommit: pullRequest.mergeCommit,
    mergedAt: pullRequest.mergedAt,
    number: pullRequest.number,
    state: pullRequest.state,
    title: pullRequest.title,
    url: pullRequest.url,
    crossReferencedPulls,
  };
};

const fetchReviewThreadComments = async ({ github, threadId }) => {
  const comments = [];
  let cursor = '';

  try {
    while (true) {
      const result = await graphqlWithRetry({
        github,
        query: reviewThreadCommentsQuery,
        variables: {
          threadId,
          cursor,
        },
      });
      const page = result.node.comments;

      comments.push(...page.nodes);

      if (!page.pageInfo.hasNextPage) {
        break;
      }

      cursor = page.pageInfo.endCursor ?? '';
    }
  } catch {
    return [];
  }

  return comments;
};

const fetchReviewThreads = async ({ github, owner, repo, pullNumber }) => {
  const reviewThreads = [];
  let cursor = '';

  while (true) {
    const result = await graphqlWithRetry({
      github,
      query: reviewThreadsQuery,
      variables: {
        owner,
        repo,
        number: pullNumber,
        cursor,
      },
    });
    const page = result.repository.pullRequest.reviewThreads;

    for (const thread of page.nodes) {
      reviewThreads.push({
        ...thread,
        comments: {
          nodes: await fetchReviewThreadComments({ github, threadId: thread.id }),
        },
      });
    }

    if (!page.pageInfo.hasNextPage) {
      break;
    }

    cursor = page.pageInfo.endCursor ?? '';
  }

  return reviewThreads;
};

const getNullableStartLine = ({ startLine, line }) => (startLine === line ? null : startLine);

const reviewThreadToComments = ({ repoFullName, pullNumber, thread }) =>
  thread.comments.nodes.map((comment) => ({
    url: `https://api.github.com/repos/${repoFullName}/pulls/comments/${comment.databaseId}`,
    pull_request_review_id: comment.pullRequestReview.databaseId,
    id: comment.databaseId,
    node_id: comment.id,
    diff_hunk: comment.diffHunk,
    path: comment.path ?? thread.path,
    commit_id: comment.commit?.oid ?? null,
    original_commit_id: comment.originalCommit?.oid ?? null,
    user: comment.author ? { login: getBotAwareLogin(comment.author) } : null,
    body: comment.body,
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
    html_url: comment.url,
    pull_request_url: `https://api.github.com/repos/${repoFullName}/pulls/${pullNumber}`,
    author_association: comment.authorAssociation,
    start_line: getNullableStartLine({ startLine: thread.startLine, line: thread.line }),
    original_start_line: getNullableStartLine({
      startLine: thread.originalStartLine,
      line: thread.originalLine,
    }),
    start_side: thread.startDiffSide,
    line: thread.line,
    original_line: thread.originalLine,
    side: thread.diffSide,
    position: comment.position,
    original_position: comment.originalPosition,
    in_reply_to_id: comment.replyTo?.databaseId ?? null,
    review_id: comment.pullRequestReview.databaseId,
    review_node_id: comment.pullRequestReview.id,
    review_state: comment.pullRequestReview.state,
    review_submitted_at: comment.pullRequestReview.submittedAt,
    reply_to_node_id: comment.replyTo?.id ?? null,
    review_comment_is_outdated: comment.outdated,
    review_thread_id: thread.id,
    review_thread_is_resolved: thread.isResolved,
    review_thread_is_outdated: thread.isOutdated,
    review_thread_path: thread.path,
    review_thread_line: thread.line,
    review_thread_start_line: thread.startLine,
    review_thread_original_line: thread.originalLine,
    review_thread_original_start_line: thread.originalStartLine,
    review_thread_diff_side: thread.diffSide,
    review_thread_start_diff_side: thread.startDiffSide,
  }));

const getReviewComments = async ({ github, owner, repo, repoFullName, pullNumber }) => {
  try {
    const threads = await fetchReviewThreads({ github, owner, repo, pullNumber });

    return threads
      .flatMap((thread) => reviewThreadToComments({ repoFullName, pullNumber, thread }))
      .sort((left, right) => left.id - right.id);
  } catch {
    return [];
  }
};

const prefetchPrContext = async ({
  github,
  core,
  outputDir = DEFAULT_OUTPUT_DIR,
  repoFullName = process.env.REPO,
  pullNumber = Number.parseInt(process.env.PR_NUMBER ?? '', 10),
}) => {
  if (!repoFullName) {
    throw new Error('REPO is required');
  }

  if (!Number.isInteger(pullNumber)) {
    throw new Error(`PR_NUMBER must be an integer, received: ${process.env.PR_NUMBER}`);
  }

  const { owner, repo } = parseRepo(repoFullName);
  fs.mkdirSync(outputDir, { recursive: true });

  core.info(`Fetching PR context for ${repoFullName}#${pullNumber}`);

  const [metadata, filesWithPatch, issueComments, reviews] = await Promise.all([
    getPrMetadata({ github, owner, repo, pullNumber }),
    github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    }),
    github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
    }),
    github.paginate(github.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    }),
  ]);

  const reviewComments = await getReviewComments({
    github,
    owner,
    repo,
    repoFullName,
    pullNumber,
  });

  writeJson({ outputDir, filename: 'pr-metadata.json', value: metadata });
  writeJson({ outputDir, filename: 'pr-files.json', value: filesWithPatch.map(withoutPatch) });
  writeJson({ outputDir, filename: 'pr-issue-comments.json', value: issueComments });
  writeJson({ outputDir, filename: 'pr-review-comments.json', value: reviewComments });
  writeJson({ outputDir, filename: 'pr-reviews.json', value: reviews });
  writeText({ outputDir, filename: 'pr-diff.txt', value: buildPrDiffFromFiles(filesWithPatch) });

  core.info(`Wrote PR context to ${outputDir}`);
};

module.exports = {
  buildPrDiffFromFiles,
  getPrMetadata,
  getReviewComments,
  graphqlWithRetry,
  prefetchPrContext,
  reviewThreadToComments,
  withoutPatch,
};
