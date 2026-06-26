'use strict';

// @ts-check

/**
 * post-review.js
 *
 * Reads all reviewer findings from /tmp/gh-aw/findings/*.jsonl, deduplicates
 * on (reviewer, path, line), cross-references this workflow's prior active
 * review comments to skip unchanged-line repeats, and writes the filtered list
 * as a JSON array to stdout.
 *
 * The coordinator runs this script after all sub-reviewers complete, then posts
 * each item via create-pull-request-review-comment.
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {{ reviewer?: string, path: string, line: number, body: string, suggestion?: string }} Finding
 * @typedef {{
 *   id?: number,
 *   node_id?: string,
 *   body?: string,
 * }} PullRequestReview
 * @typedef {{
 *   path?: string,
 *   line?: number,
 *   review_id?: number,
 *   review_node_id?: string,
 *   pull_request_review_id?: number,
 *   review_thread_is_resolved?: boolean,
 *   review_thread_is_outdated?: boolean,
 *   review_comment_is_outdated?: boolean,
 * }} ReviewComment
 * @typedef {{
 *   activeKeys: Set<string>,
 *   resolvedKeys: Set<string>,
 *   activeBodyKeys: Set<string>,
 *   resolvedBodyKeys: Set<string>,
 * }} ExistingCommentState
 * @typedef {{ findingsDir?: string, agentDir?: string, workflowId?: string }} CollectReviewFindingsOptions
 */

const DEFAULT_WORKFLOW_ID = 'reviewer-codex';
const GH_AW_REVIEW_MARKER = 'gh-aw-agentic-workflow';
const FINDING_REVIEWER_MARKER = 'gh-aw-reviewer-finding';
const REOPENED_FINDING_PREFIX =
  'This was previously marked resolved, but the issue still appears to be present.\n\n';

const DEFAULT_PATHS = Object.freeze({
  findingsDir: '/tmp/gh-aw/findings',
  agentDir: '/tmp/gh-aw/agent',
});

/**
 * @param {string} findingsDir
 * @returns {Finding[]}
 */
const readFindingJsonl = (findingsDir) => {
  /** @type {Finding[]} */
  const findings = [];

  if (!fs.existsSync(findingsDir)) {
    return findings;
  }

  for (const file of fs.readdirSync(findingsDir).filter((f) => f.endsWith('.jsonl'))) {
    const content = fs.readFileSync(path.join(findingsDir, file), 'utf8').trim();
    if (!content) continue;

    for (const line of content.split('\n').filter(Boolean)) {
      try {
        findings.push(JSON.parse(line));
      } catch {
        // Ignore malformed reviewer output; valid findings from other agents should still post.
      }
    }
  }

  return findings;
};

/**
 * @param {string | undefined} reviewer
 * @returns {string}
 */
const normalizeReviewer = (reviewer) => {
  const normalized = reviewer?.trim();
  return normalized || 'unknown-reviewer';
};

/**
 * @param {{ reviewer?: string, path: string, line: number }} finding
 * @returns {string}
 */
const findingKey = (finding) =>
  `${normalizeReviewer(finding.reviewer)}:${finding.path}:${finding.line}`;

/**
 * @param {string} body
 * @returns {string | undefined}
 */
const readFindingReviewerMarker = (body) => {
  const markerPattern = new RegExp(
    `<!--\\s*${FINDING_REVIEWER_MARKER}:\\s*reviewer=([^\\s>]+)\\s*-->`
  );
  const match = body.match(markerPattern);
  if (!match) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

/**
 * @param {string} body
 * @returns {string}
 */
const stripFindingReviewerMarker = (body) => {
  const markerPattern = new RegExp(
    `\\s*<!--\\s*${FINDING_REVIEWER_MARKER}:\\s*reviewer=[^\\s>]+\\s*-->\\s*`,
    'g'
  );
  return body.replace(markerPattern, '').trim();
};

/**
 * @param {{ path: string, line: number, body: string }} finding
 * @returns {string}
 */
const findingBodyKey = (finding) =>
  `${finding.path}:${finding.line}:${stripFindingReviewerMarker(finding.body)}`;

/**
 * @param {Finding} finding
 * @returns {Finding}
 */
const addFindingReviewerMarker = (finding) => {
  if (readFindingReviewerMarker(finding.body)) {
    return finding;
  }

  const reviewer = encodeURIComponent(normalizeReviewer(finding.reviewer));
  return {
    ...finding,
    body: `${finding.body.trimEnd()}\n\n<!-- ${FINDING_REVIEWER_MARKER}: reviewer=${reviewer} -->`,
  };
};

/**
 * Deduplicate on (reviewer, path, line), keeping the longer body when the same
 * reviewer reports the same line more than once.
 *
 * @param {Finding[]} findings
 * @returns {Finding[]}
 */
const dedupeFindings = (findings) => {
  /** @type {Map<string, Finding>} */
  const deduped = new Map();

  for (const finding of findings) {
    const key = findingKey(finding);
    const existing = deduped.get(key);
    if (!existing || existing.body.length < finding.body.length) {
      deduped.set(key, finding);
    }
  }

  return [...deduped.values()];
};

/**
 * @returns {ExistingCommentState}
 */
const createEmptyExistingCommentState = () => ({
  activeKeys: new Set(),
  resolvedKeys: new Set(),
  activeBodyKeys: new Set(),
  resolvedBodyKeys: new Set(),
});

/**
 * @param {string} value
 * @returns {string}
 */
const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

/**
 * @param {string | undefined} body
 * @param {string} workflowId
 * @returns {boolean}
 */
const isReviewFromWorkflow = (body, workflowId) => {
  if (!body?.includes(GH_AW_REVIEW_MARKER)) {
    return false;
  }

  const workflowIdPattern = new RegExp(
    `["']?workflow_id["']?\\s*[:=]\\s*["']?${escapeRegExp(workflowId)}["']?(?=[\\s,}>]|$)`
  );

  return workflowIdPattern.test(body);
};

/**
 * @param {string} agentDir
 * @param {string} workflowId
 * @returns {Set<string>}
 */
const readWorkflowReviewIds = (agentDir, workflowId) => {
  const prReviewsPath = path.join(agentDir, 'pr-reviews.json');
  const reviewIds = new Set();

  if (!fs.existsSync(prReviewsPath)) {
    return reviewIds;
  }

  try {
    /** @type {PullRequestReview[]} */
    const reviews = JSON.parse(fs.readFileSync(prReviewsPath, 'utf8'));
    for (const review of reviews) {
      if (!isReviewFromWorkflow(review.body, workflowId)) {
        continue;
      }

      if (review.id) {
        reviewIds.add(String(review.id));
      }
      if (review.node_id) {
        reviewIds.add(review.node_id);
      }
    }
  } catch {
    return new Set();
  }

  return reviewIds;
};

/**
 * @param {ReviewComment} comment
 * @param {Set<string>} workflowReviewIds
 * @returns {boolean}
 */
const isWorkflowReviewComment = (comment, workflowReviewIds) =>
  [comment.review_id, comment.review_node_id, comment.pull_request_review_id]
    .filter((id) => id !== undefined && id !== null)
    .some((id) => workflowReviewIds.has(String(id)));

/**
 * @param {ReviewComment} comment
 * @returns {boolean}
 */
const isCurrentThreadComment = (comment) =>
  comment.review_thread_is_outdated !== true && comment.review_comment_is_outdated !== true;

/**
 * @param {string} agentDir
 * @param {string} [workflowId]
 * @returns {ExistingCommentState}
 */
const readExistingCommentState = (agentDir, workflowId = DEFAULT_WORKFLOW_ID) => {
  const workflowReviewIds = readWorkflowReviewIds(agentDir, workflowId);
  const prReviewCommentsPath = path.join(agentDir, 'pr-review-comments.json');
  const existingState = createEmptyExistingCommentState();

  if (workflowReviewIds.size === 0 || !fs.existsSync(prReviewCommentsPath)) {
    return existingState;
  }

  try {
    /** @type {ReviewComment[]} */
    const existing = JSON.parse(fs.readFileSync(prReviewCommentsPath, 'utf8'));
    for (const comment of existing) {
      if (
        !comment.path ||
        !comment.line ||
        !isWorkflowReviewComment(comment, workflowReviewIds) ||
        !isCurrentThreadComment(comment)
      ) {
        continue;
      }

      const body = comment.body ?? '';
      const reviewer = readFindingReviewerMarker(body);
      const key = reviewer
        ? findingKey({ reviewer, path: comment.path, line: comment.line })
        : undefined;
      const bodyKey = findingBodyKey({
        path: comment.path,
        line: comment.line,
        body,
      });

      if (comment.review_thread_is_resolved === true) {
        if (key) {
          existingState.resolvedKeys.add(key);
        } else {
          existingState.resolvedBodyKeys.add(bodyKey);
        }
      } else {
        if (key) {
          existingState.activeKeys.add(key);
        } else {
          existingState.activeBodyKeys.add(bodyKey);
        }
      }
    }
  } catch {
    return createEmptyExistingCommentState();
  }

  return existingState;
};

/**
 * @param {string} agentDir
 * @param {string} [workflowId]
 * @returns {Set<string>}
 */
const readExistingCommentKeys = (agentDir, workflowId = DEFAULT_WORKFLOW_ID) =>
  readExistingCommentState(agentDir, workflowId).activeKeys;

/**
 * @param {Finding[]} findings
 * @param {ExistingCommentState | Set<string>} existing
 * @returns {Finding[]}
 */
const filterExistingFindings = (findings, existing) => {
  const existingState =
    existing instanceof Set
      ? {
          activeKeys: existing,
          resolvedKeys: new Set(),
          activeBodyKeys: new Set(),
          resolvedBodyKeys: new Set(),
        }
      : existing;

  return findings.flatMap((finding) => {
    const key = findingKey(finding);
    const bodyKey = findingBodyKey(finding);
    if (existingState.activeKeys.has(key) || existingState.activeBodyKeys.has(bodyKey)) {
      return [];
    }

    if (existingState.resolvedKeys.has(key) || existingState.resolvedBodyKeys.has(bodyKey)) {
      return [
        {
          ...finding,
          body: `${REOPENED_FINDING_PREFIX}${finding.body}`,
        },
      ];
    }

    return [finding];
  });
};

/**
 * @param {CollectReviewFindingsOptions} [options]
 * @returns {Finding[]}
 */
const collectReviewFindings = (options = {}) => {
  const {
    findingsDir = DEFAULT_PATHS.findingsDir,
    agentDir = DEFAULT_PATHS.agentDir,
    workflowId = DEFAULT_WORKFLOW_ID,
  } = options;

  const findings = readFindingJsonl(findingsDir);
  const deduped = dedupeFindings(findings);
  const existingState = readExistingCommentState(agentDir, workflowId);

  return filterExistingFindings(deduped, existingState).map(addFindingReviewerMarker);
};

const main = () => {
  process.stdout.write(`${JSON.stringify(collectReviewFindings())}\n`);
};

if (require.main === module) {
  main();
}

module.exports = {
  addFindingReviewerMarker,
  collectReviewFindings,
  dedupeFindings,
  filterExistingFindings,
  isReviewFromWorkflow,
  readFindingReviewerMarker,
  readExistingCommentState,
  readExistingCommentKeys,
  readFindingJsonl,
  readWorkflowReviewIds,
};
