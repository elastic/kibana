/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Classifies how a Flaky Test Fixer PR played out and prefetches the evidence the Flaky Fix
 * Retrospective agent compares. Runs as a deterministic pre-step so the agent is only started
 * when developers left a signal worth learning from:
 *
 * - a fix PR merged with developer commits on top of the fixer's patch (`revised-before-merge`)
 * - a fix PR closed because another PR fixed the failure (`replaced`) or with a developer's
 *   closing comment (`closed`)
 * - a `failed-test` issue labeled `failure:fix-did-not-hold` after a fixer PR merged (`did-not-hold`)
 *
 * Everything else (merged as proposed, closed by automation, duplicate fixes) is labeled for
 * metrics and skipped. The outcome label on the fix PR and the monthly tracking issue are the
 * only writes; the agent itself can only comment on that tracking issue.
 */

const fs = require('fs');
const path = require('path');
const {
  buildPrDiffFromFiles,
  filterTrustedComments,
  getReviewComments,
  graphqlWithRetry,
  withoutPatch,
} = require('./prefetch_pr_context');

const OWNER = 'elastic';
const REPO = 'kibana';
const FIXER_LABEL = 'flaky-test-fixer';
const FIXER_AUTHOR = 'kibanamachine';
const FAILED_TEST_LABEL = 'failed-test';
const DID_NOT_HOLD_LABEL = 'failure:fix-did-not-hold';
const RETROSPECTIVE_LABEL = 'flaky-fix-retrospective';
const TRACKING_ISSUE_TITLE_PREFIX = '[Flaky Test Fixer] Retrospective findings for ';
const OUTCOME_LABEL_PREFIX = 'flaky-fix-outcome:';
const DEFAULT_OUTPUT_DIR = '/tmp/flaky-fix-retrospective';
// A closing comment posted this close to the close event explains the closure.
const CLOSING_COMMENT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REPLACEMENT_PRS = 3;
const MAX_PRIOR_FIX_PRS = 3;
// Cited PR numbers resolved before picking the newest prior fixes.
const MAX_CITED_PRS = 10;
const MAX_DEVELOPER_COMMITS = 20;
const MAX_LINKED_ISSUES = 3;
const MAX_COMMENT_CHARS = 8000;
// Patches past these sizes are replaced by a note so the agent's context stays bounded.
const MAX_FILE_PATCH_CHARS = 40000;
const MAX_DIFF_CHARS = 300000;

// Commits by the automation itself: the fixer (kibanamachine), verifier pushes
// (github-actions[bot]) and branch updates. Anything else is a developer's change, including
// `Copilot` commits a developer asked for.
const BOT_LOGINS = new Set([
  'kibanamachine',
  'github-actions[bot]',
  'github-actions',
  'elasticmachine',
]);
const BOT_NAMES = new Set(['Kibana Machine', 'github-actions[bot]', 'Elastic Machine']);
const AUTOMATION_CLOSERS = new Set(['github-actions[bot]', 'github-actions']);

// GraphQL reports a GitHub App actor as `github-actions` while REST comments show
// `github-actions[bot]`: use the REST form everywhere so closer and comment author compare.
const actorLogin = (actor) => {
  if (!actor?.login) {
    return null;
  }
  return actor.__typename === 'Bot' && !actor.login.endsWith('[bot]')
    ? `${actor.login}[bot]`
    : actor.login;
};

const OUTCOMES = {
  mergedAsProposed: 'merged-as-proposed',
  revised: 'revised-before-merge',
  replaced: 'replaced',
  duplicate: 'duplicate',
  closed: 'closed',
  stale: 'stale',
  didNotHold: 'did-not-hold',
};

const OUTCOME_LABELS = {
  [OUTCOMES.mergedAsProposed]: {
    description: "Flaky fix retrospective: merged with the fixer's patch unchanged",
    color: '0e8a16',
  },
  [OUTCOMES.revised]: {
    description: 'Flaky fix retrospective: developers changed the patch before merging',
    color: 'fbca04',
  },
  [OUTCOMES.replaced]: {
    description: 'Flaky fix retrospective: closed, the failure was fixed by another PR',
    color: 'd93f0b',
  },
  [OUTCOMES.duplicate]: {
    description: 'Flaky fix retrospective: closed by the verifier as a duplicate fix',
    color: 'ededed',
  },
  [OUTCOMES.closed]: {
    description: 'Flaky fix retrospective: closed by a developer without a replacement fix',
    color: 'd93f0b',
  },
  [OUTCOMES.stale]: {
    description: 'Flaky fix retrospective: auto-closed after 21 days without activity',
    color: 'ededed',
  },
  [OUTCOMES.didNotHold]: {
    description: 'Flaky fix retrospective: merged, but the same failure came back',
    color: 'b60205',
  },
};

const RETROSPECTIVE_LABEL_DEFINITION = {
  description: 'Monthly tracking issue for Flaky Fix Retrospective findings',
  color: '5319e7',
};

const truncate = (text, max) =>
  typeof text === 'string' && text.length > max
    ? `${text.slice(0, max)}\n[... truncated ${text.length - max} characters]`
    : text;

const writeJson = (outputDir, filename, value) => {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = (outputDir, filename, value) => {
  fs.writeFileSync(path.join(outputDir, filename), value);
};

const labelNames = (labels = []) =>
  labels.map((label) => (typeof label === 'string' ? label : label?.name)).filter(Boolean);

/** Issue numbers a PR body closes (`Fixes #123`, `closes #45`). */
const linkedIssuesFromBody = (body) => [
  ...new Set(
    [...(body || '').matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map(
      (match) => Number(match[1])
    )
  ),
];

/** PR or issue numbers mentioned as `#123` or as a GitHub URL. */
const numbersInText = (text) => [
  ...new Set(
    [...(text || '').matchAll(/(?:#|\/(?:pull|issues)\/)(\d+)\b/g)].map((match) => Number(match[1]))
  ),
];

const isBotCommit = (commit) =>
  BOT_LOGINS.has(commit.author?.login ?? '') || BOT_NAMES.has(commit.commit?.author?.name ?? '');

/**
 * Splits a PR's commits into the automation's own and the developers', and finds the commit
 * that holds the fixer's final proposal: the last automation commit before a developer touched
 * the branch. Merge commits (branch updates) are never developer changes.
 */
const classifyCommits = (commits) => {
  const all = commits.map((commit) => ({
    sha: commit.sha,
    author: commit.author?.login ?? null,
    name: commit.commit?.author?.name ?? null,
    date: commit.commit?.author?.date ?? null,
    message: commit.commit?.message ?? '',
    isMerge: (commit.parents?.length ?? 1) > 1,
    isBot: isBotCommit(commit),
    url: commit.html_url ?? null,
  }));
  const human = all.filter((commit) => !commit.isMerge && !commit.isBot);
  const firstHumanIndex = all.findIndex((commit) => !commit.isMerge && !commit.isBot);
  const beforeHuman = firstHumanIndex === -1 ? all : all.slice(0, firstHumanIndex);
  const agentHead = [...beforeHuman].reverse().find((commit) => commit.isBot && !commit.isMerge);
  return { all, human, agentHeadSha: agentHead?.sha ?? all[0]?.sha ?? null };
};

const boundedPatchFiles = (files) => {
  let budget = MAX_DIFF_CHARS;
  return files.map((file) => {
    const patch = file.patch ?? '';
    if (patch.length > MAX_FILE_PATCH_CHARS || patch.length > budget) {
      return {
        ...file,
        patch: `# Patch omitted (${patch.length} characters). Fetch it from GitHub if needed.`,
      };
    }
    budget -= patch.length;
    return file;
  });
};

const fetchPrFiles = async ({ github, pullNumber }) => {
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
    per_page: 100,
  });
  const bounded = boundedPatchFiles(files);
  return { files: bounded.map(withoutPatch), diff: buildPrDiffFromFiles(bounded) };
};

const fetchCommitPatch = async ({ github, sha }) => {
  const { data } = await github.rest.repos.getCommit({ owner: OWNER, repo: REPO, ref: sha });
  return {
    sha: data.sha,
    url: data.html_url,
    message: data.commit?.message ?? '',
    author: data.author?.login ?? data.commit?.author?.name ?? null,
    date: data.commit?.author?.date ?? null,
    diff: buildPrDiffFromFiles(boundedPatchFiles(data.files ?? [])),
  };
};

/** The fixer's proposal as of `sha`: its diff against the merge base with the PR's base branch. */
const fetchAgentDiff = async ({ github, baseRef, sha }) => {
  const { data } = await github.rest.repos.compareCommitsWithBasehead({
    owner: OWNER,
    repo: REPO,
    basehead: `${baseRef}...${sha}`,
  });
  return buildPrDiffFromFiles(boundedPatchFiles(data.files ?? []));
};

const trimComment = (comment) => ({
  id: comment.id,
  user: comment.user?.login ?? null,
  created_at: comment.created_at,
  html_url: comment.html_url,
  body: truncate(comment.body ?? '', MAX_COMMENT_CHARS),
});

const fetchIssueComments = async ({ github, issueNumber, authorLogin }) => {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner: OWNER,
    repo: REPO,
    issue_number: issueNumber,
    per_page: 100,
  });
  return filterTrustedComments({ comments, prAuthorLogin: authorLogin }).map(trimComment);
};

const parseCiData = (body) => {
  const match = (body || '').match(/<!--\s*kibanaCiData\s*=\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1])['failed-test'] ?? null;
  } catch {
    return null;
  }
};

const issueHistoryQuery = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
          nodes { number merged mergedAt author { login } labels(first: 30) { nodes { name } } }
        }
        timelineItems(first: 100, itemTypes: [CLOSED_EVENT, REOPENED_EVENT, CROSS_REFERENCED_EVENT, LABELED_EVENT]) {
          nodes {
            __typename
            ... on ClosedEvent { createdAt closer { __typename ... on PullRequest { number } } }
            ... on ReopenedEvent { createdAt }
            ... on LabeledEvent { createdAt label { name } }
            ... on CrossReferencedEvent {
              createdAt
              source {
                ... on PullRequest { number merged mergedAt author { login } labels(first: 30) { nodes { name } } }
              }
            }
          }
        }
      }
    }
  }
`;

/** Merged PRs tied to an issue (closing references, closer PRs, cross references) and its timeline. */
const fetchIssueHistory = async ({ github, issueNumber }) => {
  const result = await graphqlWithRetry({
    github,
    query: issueHistoryQuery,
    variables: { owner: OWNER, repo: REPO, number: issueNumber },
  });
  const issue = result.repository.issue;
  const prs = new Map();
  const remember = (pr) => {
    if (pr?.number && pr.merged) {
      prs.set(pr.number, {
        number: pr.number,
        merged: true,
        mergedAt: pr.mergedAt ?? null,
        author: pr.author?.login ?? null,
        labels: (pr.labels?.nodes ?? []).map((label) => label.name),
      });
    }
  };
  issue.closedByPullRequestsReferences.nodes.forEach(remember);
  const timeline = [];
  for (const item of issue.timelineItems.nodes) {
    if (item.__typename === 'CrossReferencedEvent') {
      remember(item.source);
      continue;
    }
    if (item.__typename === 'ClosedEvent' && item.closer?.__typename === 'PullRequest') {
      timeline.push({ event: 'closed', at: item.createdAt, pr: item.closer.number });
    } else if (item.__typename === 'ClosedEvent') {
      timeline.push({ event: 'closed', at: item.createdAt });
    } else if (item.__typename === 'ReopenedEvent') {
      timeline.push({ event: 'reopened', at: item.createdAt });
    } else if (item.__typename === 'LabeledEvent') {
      timeline.push({ event: 'labeled', at: item.createdAt, label: item.label?.name });
    }
  }
  // A closer PR only shows up as a number on the timeline: resolve it so it counts as merged.
  for (const entry of timeline) {
    if (entry.pr && !prs.has(entry.pr)) {
      const { data } = await github.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: entry.pr,
      });
      remember({
        number: data.number,
        merged: data.merged,
        mergedAt: data.merged_at,
        author: { login: data.user?.login },
        labels: { nodes: data.labels ?? [] },
      });
    }
  }
  return { mergedPrs: [...prs.values()], timeline };
};

const fetchIssueContext = async ({ github, issueNumber }) => {
  const { data: issue } = await github.rest.issues.get({
    owner: OWNER,
    repo: REPO,
    issue_number: issueNumber,
  });
  const [comments, history] = await Promise.all([
    fetchIssueComments({ github, issueNumber, authorLogin: issue.user?.login }),
    fetchIssueHistory({ github, issueNumber }),
  ]);
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    html_url: issue.html_url,
    labels: labelNames(issue.labels),
    created_at: issue.created_at,
    closed_at: issue.closed_at,
    body: truncate(issue.body ?? '', MAX_COMMENT_CHARS),
    ciData: parseCiData(issue.body),
    mergedPrs: history.mergedPrs,
    timeline: history.timeline,
    comments,
  };
};

const isFixerPr = (pr) =>
  (pr.author === FIXER_AUTHOR || pr.user?.login === FIXER_AUTHOR) &&
  labelNames(pr.labels).includes(FIXER_LABEL);

const prSummary = (pr) => ({
  number: pr.number,
  title: pr.title,
  html_url: pr.html_url,
  author: pr.user?.login ?? null,
  state: pr.state,
  merged: Boolean(pr.merged),
  merged_at: pr.merged_at,
  closed_at: pr.closed_at,
  created_at: pr.created_at,
  base: pr.base?.ref ?? null,
  labels: labelNames(pr.labels),
  linkedIssues: linkedIssuesFromBody(pr.body),
  body: truncate(pr.body ?? '', MAX_COMMENT_CHARS),
});

/** A PR with its merged diff and the conversation around it, for a replacement or a prior fix. */
const fetchRelatedPr = async ({ github, pullNumber }) => {
  const { data: pr } = await github.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
  });
  const [{ files, diff }, comments, reviews] = await Promise.all([
    fetchPrFiles({ github, pullNumber }),
    fetchIssueComments({ github, issueNumber: pullNumber, authorLogin: pr.user?.login }),
    github.paginate(github.rest.pulls.listReviews, {
      owner: OWNER,
      repo: REPO,
      pull_number: pullNumber,
      per_page: 100,
    }),
  ]);
  return {
    ...prSummary(pr),
    isFixerPr: isFixerPr(pr),
    files,
    diff,
    comments,
    reviews: reviews.map((review) => ({
      user: review.user?.login ?? null,
      state: review.state,
      submitted_at: review.submitted_at,
      body: truncate(review.body ?? '', MAX_COMMENT_CHARS),
    })),
  };
};

const closedEventQuery = `
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        timelineItems(last: 1, itemTypes: [CLOSED_EVENT]) {
          nodes { ... on ClosedEvent { createdAt actor { __typename login } } }
        }
      }
    }
  }
`;

const fetchCloser = async ({ github, pullNumber }) => {
  const result = await graphqlWithRetry({
    github,
    query: closedEventQuery,
    variables: { owner: OWNER, repo: REPO, number: pullNumber },
  });
  const event = result.repository.pullRequest.timelineItems.nodes[0];
  return { login: actorLogin(event?.actor), at: event?.createdAt ?? null };
};

/** The comment that explains a closure: the closer's comment nearest to the close event. */
const findClosingComment = ({ comments, closer, closedAt }) => {
  if (!closer) {
    return null;
  }
  const own = comments.filter((comment) => comment.user === closer);
  if (own.length === 0) {
    return null;
  }
  const closedTime = closedAt ? new Date(closedAt).getTime() : null;
  const nearby = closedTime
    ? own.filter(
        (comment) =>
          Math.abs(new Date(comment.created_at).getTime() - closedTime) <= CLOSING_COMMENT_WINDOW_MS
      )
    : [];
  return (nearby.length > 0 ? nearby : own)[nearby.length > 0 ? nearby.length - 1 : own.length - 1];
};

const automationClosureOutcome = (closingComment) => {
  const body = closingComment?.body ?? '';
  if (body.includes('Closing as a duplicate fix')) {
    return OUTCOMES.duplicate;
  }
  return OUTCOMES.stale;
};

const ensureLabel = async ({ github, core, name, definition, dryRun }) => {
  try {
    await github.rest.issues.getLabel({ owner: OWNER, repo: REPO, name });
    return;
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
  if (dryRun) {
    core.info(`[dry run] would create label ${name}`);
    return;
  }
  await github.rest.issues.createLabel({ owner: OWNER, repo: REPO, name, ...definition });
  core.info(`Created label ${name}`);
};

const applyOutcomeLabel = async ({ github, core, pullNumber, outcome, dryRun }) => {
  const name = `${OUTCOME_LABEL_PREFIX}${outcome}`;
  await ensureLabel({ github, core, name, definition: OUTCOME_LABELS[outcome], dryRun });
  if (dryRun) {
    core.info(`[dry run] would label #${pullNumber} with ${name}`);
    return name;
  }
  await github.rest.issues.addLabels({
    owner: OWNER,
    repo: REPO,
    issue_number: pullNumber,
    labels: [name],
  });
  core.info(`Labeled #${pullNumber} with ${name}`);
  return name;
};

const trackingIssueBody = (month) =>
  [
    `Findings recorded by the [Flaky Fix Retrospective](https://github.com/${OWNER}/${REPO}/blob/main/.github/workflows/flaky-fix-retrospective.md) workflow during ${month}, one comment per finding.`,
    '',
    '> [!NOTE]',
    '> A finding compares what the Flaky Test Fixer proposed with what developers did instead, or with the failure that came back:',
    '>',
    '> - **Revised before merge**: developers changed the patch before merging it',
    '> - **Replaced**: the fix PR was closed and another PR fixed the failure',
    '> - **Closed**: a developer closed the fix PR without a replacement',
    '> - **Did not hold**: the fix merged, but the same failure was reported again',
    '>',
    '> Each finding ends with a collapsed `flaky-fix-finding` block that the weekly curator reads to propose guideline updates. Fix PRs also carry a `flaky-fix-outcome:*` label for metrics.',
  ].join('\n');

/** The monthly tracking issue the agent comments on, created on the first finding of the month. */
const findOrCreateTrackingIssue = async ({ github, core, month, dryRun }) => {
  const title = `${TRACKING_ISSUE_TITLE_PREFIX}${month}`;
  // The issues list is read-after-write consistent, unlike search, so a run early in the month
  // sees the tracking issue another run just created.
  const tracked = await github.paginate(github.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    labels: RETROSPECTIVE_LABEL,
    state: 'all',
    sort: 'created',
    direction: 'desc',
    per_page: 100,
  });
  const matches = tracked.filter((item) => item.title === title && !item.pull_request);
  const existing = matches.find((item) => item.state === 'open') ?? matches[0];
  if (existing) {
    return existing.number;
  }
  await ensureLabel({
    github,
    core,
    name: RETROSPECTIVE_LABEL,
    definition: RETROSPECTIVE_LABEL_DEFINITION,
    dryRun,
  });
  if (dryRun) {
    core.info(`[dry run] would create tracking issue "${title}"`);
    return null;
  }
  const { data: issue } = await github.rest.issues.create({
    owner: OWNER,
    repo: REPO,
    title,
    body: trackingIssueBody(month),
    labels: [RETROSPECTIVE_LABEL, 'Team:QA'],
  });
  core.info(`Created tracking issue #${issue.number}`);
  return issue.number;
};

const fetchLinkedIssues = async ({ github, numbers }) => {
  const issues = [];
  for (const number of numbers.slice(0, MAX_LINKED_ISSUES)) {
    try {
      issues.push(await fetchIssueContext({ github, issueNumber: number }));
    } catch (error) {
      issues.push({ number, error: error.message });
    }
  }
  return issues;
};

/** Classifies a closed fixer PR. Returns the context to write and the outcome decided. */
const classifyPullRequest = async ({ github, core, pullNumber }) => {
  const { data: pr } = await github.rest.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
  });
  if (!isFixerPr(pr)) {
    return { skip: `#${pullNumber} is not a ${FIXER_LABEL} PR by ${FIXER_AUTHOR}` };
  }
  if (pr.state !== 'closed') {
    return { skip: `#${pullNumber} is still open` };
  }

  const commitsRaw = await github.paginate(github.rest.pulls.listCommits, {
    owner: OWNER,
    repo: REPO,
    pull_number: pullNumber,
    per_page: 100,
  });
  const commits = classifyCommits(commitsRaw);
  const [{ files, diff }, comments, reviewsRaw, reviewComments] = await Promise.all([
    fetchPrFiles({ github, pullNumber }),
    fetchIssueComments({ github, issueNumber: pullNumber, authorLogin: pr.user?.login }),
    github.paginate(github.rest.pulls.listReviews, {
      owner: OWNER,
      repo: REPO,
      pull_number: pullNumber,
      per_page: 100,
    }),
    getReviewComments({
      github,
      owner: OWNER,
      repo: REPO,
      repoFullName: `${OWNER}/${REPO}`,
      pullNumber,
    }),
  ]);
  const reviews = filterTrustedComments({
    comments: reviewsRaw,
    prAuthorLogin: pr.user?.login,
  }).map((review) => ({
    user: review.user?.login ?? null,
    state: review.state,
    submitted_at: review.submitted_at,
    body: truncate(review.body ?? '', MAX_COMMENT_CHARS),
  }));
  const trustedReviewComments = filterTrustedComments({
    comments: reviewComments,
    prAuthorLogin: pr.user?.login,
  }).map((comment) => ({
    user: comment.user?.login ?? null,
    path: comment.path,
    line: comment.line ?? comment.original_line ?? null,
    created_at: comment.created_at,
    html_url: comment.html_url,
    body: truncate(comment.body ?? '', MAX_COMMENT_CHARS),
  }));
  const linkedIssueNumbers = linkedIssuesFromBody(pr.body);

  const context = {
    fixPr: {
      ...prSummary(pr),
      merged_by: pr.merged_by?.login ?? null,
      merge_commit_sha: pr.merge_commit_sha,
      commits: commits.all,
      developerCommits: commits.human.map(({ sha, author, date, message, url }) => ({
        sha,
        author,
        date,
        message,
        url,
      })),
      agentHeadSha: commits.agentHeadSha,
    },
    files,
    diff,
    comments,
    reviews,
    reviewComments: trustedReviewComments,
  };

  if (pr.merged) {
    const changesRequested = reviews.some((review) => review.state === 'CHANGES_REQUESTED');
    if (commits.human.length === 0 && !changesRequested) {
      return {
        outcome: OUTCOMES.mergedAsProposed,
        needsAnalysis: false,
        context,
        reason: 'no developer commits',
      };
    }
    const [agentDiff, developerCommits, linkedIssues] = await Promise.all([
      commits.agentHeadSha
        ? fetchAgentDiff({ github, baseRef: pr.base.ref, sha: commits.agentHeadSha })
        : Promise.resolve(''),
      Promise.all(
        commits.human
          .slice(0, MAX_DEVELOPER_COMMITS)
          .map((commit) => fetchCommitPatch({ github, sha: commit.sha }))
      ),
      fetchLinkedIssues({ github, numbers: linkedIssueNumbers }),
    ]);
    return {
      outcome: OUTCOMES.revised,
      needsAnalysis: true,
      context: { ...context, agentDiff, developerCommits, linkedIssues },
      reason: `${commits.human.length} developer commit(s)${
        changesRequested ? ', changes requested' : ''
      }`,
    };
  }

  const closer = await fetchCloser({ github, pullNumber });
  const closingComment = findClosingComment({
    comments,
    closer: closer.login,
    closedAt: closer.at ?? pr.closed_at,
  });
  const closedContext = { ...context, closer, closingComment };
  if (AUTOMATION_CLOSERS.has(closer.login ?? '')) {
    const outcome = automationClosureOutcome(closingComment);
    return {
      outcome,
      needsAnalysis: false,
      context: closedContext,
      reason: `closed by ${closer.login}`,
    };
  }

  const linkedIssues = await fetchLinkedIssues({ github, numbers: linkedIssueNumbers });
  // A replacement landed after the fixer opened its PR; older merged PRs tied to the issue are
  // earlier attempts, not what superseded this one. The PR the closer named comes first so the
  // cap cannot push it out.
  const openedAt = new Date(pr.created_at).getTime();
  const candidates = new Set(numbersInText(closingComment?.body));
  for (const issue of linkedIssues) {
    for (const merged of issue.mergedPrs ?? []) {
      if (merged.mergedAt && new Date(merged.mergedAt).getTime() > openedAt) {
        candidates.add(merged.number);
      }
    }
  }
  candidates.delete(pullNumber);
  // The cap counts confirmed replacements: a closing comment also cites issues and older PRs.
  const replacementPrs = [];
  for (const number of [...candidates].slice(0, MAX_CITED_PRS)) {
    if (replacementPrs.length >= MAX_REPLACEMENT_PRS) {
      break;
    }
    try {
      const related = await fetchRelatedPr({ github, pullNumber: number });
      if (related.merged && new Date(related.merged_at).getTime() > openedAt) {
        replacementPrs.push(related);
      }
    } catch (error) {
      core.warning(`Could not fetch replacement candidate #${number}: ${error.message}`);
    }
  }
  const withIssues = { ...closedContext, linkedIssues, replacementPrs };
  if (replacementPrs.length > 0) {
    const onlyFixerDuplicates =
      replacementPrs.every((candidate) => candidate.isFixerPr) && !closingComment;
    if (onlyFixerDuplicates) {
      return {
        outcome: OUTCOMES.duplicate,
        needsAnalysis: false,
        context: withIssues,
        reason: 'replaced by another fixer PR',
      };
    }
    return {
      outcome: OUTCOMES.replaced,
      needsAnalysis: true,
      context: withIssues,
      reason: `replaced by #${replacementPrs.map((candidate) => candidate.number).join(', #')}`,
    };
  }
  return {
    outcome: OUTCOMES.closed,
    needsAnalysis: Boolean(closingComment),
    context: withIssues,
    reason: closingComment
      ? `closed by ${closer.login} with a comment`
      : `closed by ${closer.login} without a comment`,
  };
};

/** Prior fixer PRs that fixed this failure: tied to the issue, or to sibling issues for the same test. */
const findPriorFixPrs = async ({ github, core, issue, labeledAt }) => {
  const cutoff = labeledAt ? new Date(labeledAt).getTime() : Date.now();
  const found = new Map();
  const consider = (pr) => {
    if (
      pr.merged &&
      pr.author === FIXER_AUTHOR &&
      pr.labels.includes(FIXER_LABEL) &&
      (!pr.mergedAt || new Date(pr.mergedAt).getTime() <= cutoff)
    ) {
      found.set(pr.number, pr);
    }
  };
  issue.mergedPrs.forEach(consider);

  // PR numbers the investigator cited while deciding the fix did not hold.
  const investigatorComments = issue.comments.filter(
    (comment) => comment.user === 'github-actions[bot]'
  );
  const cited = investigatorComments.flatMap((comment) => numbersInText(comment.body));

  // The reporter files a fresh issue for the same test once the old one has been closed for a
  // while, so the fix usually closed a sibling issue with the same title.
  const testName = issue.ciData?.['test.name'];
  if (found.size === 0 && testName) {
    const phrase = testName.replace(/["\\]/g, ' ').slice(0, 120).trim();
    try {
      const { data } = await github.rest.search.issuesAndPullRequests({
        q: `repo:${OWNER}/${REPO} is:issue label:${FAILED_TEST_LABEL} in:title "${phrase}"`,
        per_page: 10,
      });
      for (const sibling of data.items) {
        if (
          sibling.number === issue.number ||
          sibling.pull_request ||
          !sibling.title.includes(testName.slice(0, 60))
        ) {
          continue;
        }
        const history = await fetchIssueHistory({ github, issueNumber: sibling.number });
        history.mergedPrs.forEach(consider);
      }
    } catch (error) {
      core.warning(`Sibling issue search failed: ${error.message}`);
    }
  }

  // Resolve the latest citations first: the newest investigator comment names the fix that
  // actually came back, and older comments may reference unrelated issues.
  for (const number of [...new Set(cited.reverse())].slice(0, MAX_CITED_PRS)) {
    if (found.has(number)) {
      continue;
    }
    try {
      const { data } = await github.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: number,
      });
      consider({
        number: data.number,
        merged: data.merged,
        mergedAt: data.merged_at,
        author: data.user?.login ?? null,
        labels: labelNames(data.labels),
      });
    } catch {
      // Not a PR, or not readable: the number was an issue or a typo.
    }
  }

  return [...found.values()]
    .sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? ''))
    .slice(0, MAX_PRIOR_FIX_PRS);
};

/** Classifies a `failed-test` issue that was just labeled `failure:fix-did-not-hold`. */
const classifyDidNotHoldIssue = async ({ github, core, issueNumber, labeledAt }) => {
  const issue = await fetchIssueContext({ github, issueNumber });
  if (!issue.labels.includes(FAILED_TEST_LABEL)) {
    return { skip: `#${issueNumber} is not a ${FAILED_TEST_LABEL} issue` };
  }
  // The fix that did not hold is the newest one merged before the label went on. The
  // timeline knows when that was, which matters on a manual run (no event payload) and
  // when a later fix has merged since.
  const labelEvents = (issue.timeline ?? []).filter(
    (entry) => entry.event === 'labeled' && entry.label === DID_NOT_HOLD_LABEL && entry.at
  );
  const cutoffAt = labelEvents.length ? labelEvents[labelEvents.length - 1].at : labeledAt;
  const priorFixes = await findPriorFixPrs({ github, core, issue, labeledAt: cutoffAt });
  if (priorFixes.length === 0) {
    return {
      skip: `no merged ${FIXER_LABEL} PR found for #${issueNumber} (the fix that did not hold was not the fixer's)`,
      context: { issue },
    };
  }
  const priorFixPrs = [];
  for (const prior of priorFixes) {
    priorFixPrs.push(await fetchRelatedPr({ github, pullNumber: prior.number }));
  }
  // Only the newest fix is the one that just failed to hold; the older ones were already
  // superseded and were judged when their own recurrence came in.
  return {
    outcome: OUTCOMES.didNotHold,
    needsAnalysis: true,
    context: { issue, priorFixPrs, labeledAt: cutoffAt ?? new Date().toISOString() },
    reason: `prior fix #${priorFixPrs[0].number} did not hold`,
    labelTargets: [priorFixPrs[0].number],
  };
};

const writeContext = ({ outputDir, result, retrospective }) => {
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(outputDir, 'retrospective.json', retrospective);
  const { context = {} } = result;
  if (context.fixPr) {
    writeJson(outputDir, 'fix-pr.json', context.fixPr);
    writeJson(outputDir, 'fix-pr-files.json', context.files);
    writeText(outputDir, 'fix-pr-diff.txt', context.diff);
    writeJson(outputDir, 'fix-pr-comments.json', context.comments);
    writeJson(outputDir, 'fix-pr-reviews.json', context.reviews);
    writeJson(outputDir, 'fix-pr-review-comments.json', context.reviewComments);
  }
  if (context.agentDiff !== undefined) {
    writeText(outputDir, 'fixer-proposal-diff.txt', context.agentDiff);
  }
  if (context.developerCommits) {
    writeJson(outputDir, 'developer-commits.json', context.developerCommits);
  }
  if (context.closer) {
    writeJson(outputDir, 'closure.json', {
      closer: context.closer,
      closingComment: context.closingComment ?? null,
    });
  }
  if (context.linkedIssues) {
    writeJson(outputDir, 'linked-issues.json', context.linkedIssues);
  }
  if (context.replacementPrs) {
    writeJson(outputDir, 'replacement-prs.json', context.replacementPrs);
  }
  if (context.issue) {
    writeJson(outputDir, 'issue.json', context.issue);
  }
  if (context.priorFixPrs) {
    writeJson(outputDir, 'prior-fix-prs.json', context.priorFixPrs);
  }
};

/**
 * Workflow entry point: classify the event, write the agent's context files, label the fix PR,
 * and resolve the tracking issue. Sets the `needs_analysis`, `case`, `tracking_issue` and
 * `fix_pr` outputs the workflow gates on.
 */
const runFlakyFixRetrospectiveContext = async ({
  github,
  core,
  outputDir = DEFAULT_OUTPUT_DIR,
  prNumber,
  issueNumber,
  labeledAt,
  dryRun = false,
  now = new Date(),
}) => {
  const setOutputs = (values) => {
    for (const [key, value] of Object.entries(values)) {
      core.setOutput(key, value == null ? '' : String(value));
    }
  };

  let result;
  if (Number.isInteger(prNumber) && prNumber > 0) {
    result = await classifyPullRequest({ github, core, pullNumber: prNumber });
  } else if (Number.isInteger(issueNumber) && issueNumber > 0) {
    result = await classifyDidNotHoldIssue({ github, core, issueNumber, labeledAt });
  } else {
    throw new Error('A positive PR number or issue number is required');
  }

  const fixPrNumbers =
    result.labelTargets ?? (result.context?.fixPr ? [result.context.fixPr.number] : []);
  const retrospective = {
    generatedAt: now.toISOString(),
    case: result.outcome ?? null,
    needsAnalysis: Boolean(result.needsAnalysis),
    reason: result.reason ?? result.skip ?? null,
    fixPrs: fixPrNumbers,
    issue: issueNumber ?? null,
    trackingIssue: null,
    files: [],
  };

  if (result.skip) {
    core.info(`Skipping: ${result.skip}`);
    writeContext({ outputDir, result, retrospective });
    setOutputs({
      needs_analysis: false,
      case: '',
      tracking_issue: '',
      fix_pr: fixPrNumbers[0] ?? '',
    });
    return retrospective;
  }

  for (const number of fixPrNumbers) {
    await applyOutcomeLabel({ github, core, pullNumber: number, outcome: result.outcome, dryRun });
  }

  if (result.needsAnalysis) {
    retrospective.trackingIssue = await findOrCreateTrackingIssue({
      github,
      core,
      month: now.toISOString().slice(0, 7),
      dryRun,
    });
  }
  writeContext({ outputDir, result, retrospective });
  retrospective.files = fs.readdirSync(outputDir).sort();
  writeJson(outputDir, 'retrospective.json', retrospective);

  core.info(
    `Outcome for ${
      fixPrNumbers.map((number) => `#${number}`).join(', ') || `issue #${issueNumber}`
    }: ${result.outcome} (${result.reason}); analysis ${
      result.needsAnalysis ? 'needed' : 'not needed'
    }`
  );
  setOutputs({
    needs_analysis: result.needsAnalysis,
    case: result.outcome,
    tracking_issue: retrospective.trackingIssue,
    fix_pr: fixPrNumbers[0] ?? '',
  });
  return retrospective;
};

module.exports = {
  OUTCOMES,
  OUTCOME_LABELS,
  RETROSPECTIVE_LABEL,
  automationClosureOutcome,
  classifyCommits,
  classifyDidNotHoldIssue,
  classifyPullRequest,
  findClosingComment,
  linkedIssuesFromBody,
  numbersInText,
  parseCiData,
  runFlakyFixRetrospectiveContext,
};
