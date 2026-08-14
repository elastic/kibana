/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Deterministic duplicate-fix detector for the Flaky Test Fixer flow.
 *
 * The fixer opens one PR per `failed-test` issue, but many of those issues share a
 * single root cause (the same page-object method or spec file), so the fixer opens
 * several PRs that all touch the same code. They are usually created within minutes
 * of each other by parallel runs, so neither the fixer's pre-run search nor a naive
 * "is a PR already open?" check catches them. This module surfaces, for a given
 * target (an issue about to be fixed, or a fix PR under verification), the other
 * `flaky-test-fixer` PRs that touch the same file(s) or reference the same issue, and
 * picks a single canonical PR for the group so callers can converge on it
 * deterministically even when they run concurrently.
 */

const fs = require('fs');
const path = require('path');

const FIXER_LABEL = 'flaky-test-fixer';
// A merged fix means the root cause already landed, so a still-open sibling touching
// the same code is redundant. Older merges are irrelevant to what is in flight now.
const MERGED_LOOKBACK_DAYS = 30;
const DEFAULT_GRAPHQL_ATTEMPTS = 3;
const DEFAULT_GRAPHQL_RETRY_DELAY_MS = 1000;

// Files almost every fix would touch or that carry no root-cause signal: sharing one of
// these is not evidence two PRs fix the same flake, so they never seed a candidate match.
const IGNORED_PATH_PATTERNS = [
  /^\.github\//,
  /(^|\/)versions\.json$/,
  /(^|\/)renovate\.json$/,
  /(^|\/)(yarn\.lock|package-lock\.json|package\.json)$/,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRepo = (repoFullName) => {
  const [owner, repo] = (repoFullName ?? '').split('/');
  if (!owner || !repo) {
    throw new Error(`Expected REPO in owner/repo form, received: ${repoFullName}`);
  }
  return { owner, repo };
};

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

const isMeaningfulPath = (filePath) =>
  Boolean(filePath) && !IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(filePath));

const searchQuery = `
  query($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: ISSUE, first: 50, after: $cursor) {
      nodes {
        ... on PullRequest {
          number
          state
          url
          createdAt
          mergedAt
          headRefName
          files(first: 100) {
            nodes {
              path
            }
          }
          closingIssuesReferences(first: 20) {
            nodes {
              number
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const runSearch = async ({ github, searchString }) => {
  const results = [];
  let cursor = null;
  while (true) {
    const page = await graphqlWithRetry({
      github,
      query: searchQuery,
      variables: { searchQuery: searchString, cursor },
    });
    const { nodes, pageInfo } = page.search;
    for (const node of nodes) {
      // Non-PR search hits come back as empty objects for this fragment.
      if (node && typeof node.number === 'number') {
        results.push(node);
      }
    }
    if (!pageInfo.hasNextPage) {
      break;
    }
    cursor = pageInfo.endCursor;
  }
  return results;
};

const normalizePr = (node) => ({
  number: node.number,
  state: node.state,
  url: node.url,
  createdAt: node.createdAt,
  mergedAt: node.mergedAt ?? null,
  headRefName: node.headRefName,
  files: (node.files?.nodes ?? []).map((file) => file.path).filter(Boolean),
  linkedIssues: (node.closingIssuesReferences?.nodes ?? []).map((issue) => issue.number),
});

// Every `flaky-test-fixer` PR that could still represent work in flight for a root
// cause: all open ones, plus anything merged in the recent lookback window (a merge
// means the fix already landed, so an open sibling is redundant).
const fetchFixerPrs = async ({ github, owner, repo }) => {
  const cutoff = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const base = `repo:${owner}/${repo} is:pr label:${FIXER_LABEL}`;
  const [open, merged] = await Promise.all([
    runSearch({ github, searchString: `${base} is:open` }),
    runSearch({ github, searchString: `${base} is:merged merged:>=${cutoff}` }),
  ]);

  const byNumber = new Map();
  for (const node of [...open, ...merged]) {
    byNumber.set(node.number, normalizePr(node));
  }
  return [...byNumber.values()];
};

const fetchPrFiles = async ({ github, owner, repo, pullNumber }) => {
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return files.map((file) => file.filename).filter(Boolean);
};

// Test/spec paths named in a `failed-test` issue body — the fixer's target file(s)
// before any PR exists. Deliberately narrow: only real test paths, so an incidental
// path mention (e.g. a stack trace frame) does not widen the match.
const extractTestFilesFromText = (text) => {
  if (!text) {
    return [];
  }
  const matches = text.match(
    /[A-Za-z0-9._/-]+\.(?:spec|test|cy)\.(?:ts|tsx|js)|[A-Za-z0-9._/-]*config[A-Za-z0-9._/-]*\.ts/g
  );
  return [...new Set(matches ?? [])];
};

// Earliest-created PR wins so concurrent callers converge on one canonical without
// coordination. A merged member trumps every open one: the fix has already landed, so
// the whole group should collapse onto it.
const pickCanonical = (members) => {
  if (members.length === 0) {
    return null;
  }
  const merged = members
    .filter((member) => member.state === 'MERGED')
    .sort((a, b) => (a.mergedAt ?? '').localeCompare(b.mergedAt ?? ''));
  if (merged.length > 0) {
    return merged[0];
  }
  const open = members
    .filter((member) => member.state === 'OPEN')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return open[0] ?? members.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
};

const overlap = (a, b) => a.filter((value) => b.includes(value));

/**
 * Find `flaky-test-fixer` PRs that duplicate a target.
 *
 * Pass `prNumber` (verifier: a fix PR under review) or `issueNumber` (fixer: an issue
 * about to be fixed); `testFiles` supplements the issue path parsing. Returns the
 * overlapping candidates, the deterministically-chosen `canonical` PR for the group,
 * and — in `prNumber` mode — whether the target itself is that canonical.
 */
const findDuplicateFixPrs = async ({
  github,
  repoFullName = process.env.REPO,
  prNumber,
  issueNumber,
  testFiles = [],
  issueBody = '',
}) => {
  const { owner, repo } = parseRepo(repoFullName);
  const fixerPrs = await fetchFixerPrs({ github, owner, repo });

  let targetFiles = [];
  let targetIssues = [];
  let self = null;

  if (prNumber != null) {
    self = fixerPrs.find((pr) => pr.number === prNumber) ?? null;
    targetFiles = self
      ? self.files
      : await fetchPrFiles({ github, owner, repo, pullNumber: prNumber });
    targetIssues = self ? self.linkedIssues : [];
  } else if (issueNumber != null) {
    targetIssues = [issueNumber];
    targetFiles = [...new Set([...testFiles, ...extractTestFilesFromText(issueBody)])];
  } else {
    throw new Error('findDuplicateFixPrs requires either prNumber or issueNumber');
  }

  const meaningfulTargetFiles = targetFiles.filter(isMeaningfulPath);

  const candidates = [];
  for (const pr of fixerPrs) {
    if (prNumber != null && pr.number === prNumber) {
      continue;
    }
    const sharedFiles = overlap(meaningfulTargetFiles, pr.files.filter(isMeaningfulPath));
    const sharedIssues = overlap(targetIssues, pr.linkedIssues);
    if (sharedFiles.length === 0 && sharedIssues.length === 0) {
      continue;
    }
    candidates.push({
      number: pr.number,
      state: pr.state,
      url: pr.url,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      headRefName: pr.headRefName,
      linkedIssues: pr.linkedIssues,
      sharedFiles,
      sharedIssues,
    });
  }
  candidates.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const groupMembers = self ? [self, ...candidates] : candidates;
  const canonical = pickCanonical(groupMembers);
  const mergedMemberExists = groupMembers.some((member) => member.state === 'MERGED');

  return {
    target: {
      prNumber: prNumber ?? null,
      issueNumber: issueNumber ?? null,
      files: meaningfulTargetFiles,
      linkedIssues: targetIssues,
    },
    candidates,
    canonical: canonical
      ? { number: canonical.number, url: canonical.url, state: canonical.state }
      : null,
    isSelfCanonical: self != null && canonical != null && canonical.number === self.number,
    mergedMemberExists,
  };
};

// Convenience wrapper for a workflow pre-step: run the detector and drop the result in
// the agent's context dir so the agent reads a file instead of re-deriving it live.
const writeDuplicateCandidates = async ({
  github,
  core,
  outputDir = '/tmp/gh-aw/agent',
  filename = 'duplicate-candidates.json',
  prNumber,
  issueNumber,
  issueBody,
  testFiles,
}) => {
  const result = await findDuplicateFixPrs({
    github,
    prNumber,
    issueNumber,
    issueBody,
    testFiles,
  });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(result, null, 2)}\n`);
  const log = core?.info ?? console.log;
  log(
    `Duplicate detector: ${result.candidates.length} candidate(s) for ${
      prNumber != null ? `PR #${prNumber}` : `issue #${issueNumber}`
    }; canonical ${result.canonical ? `#${result.canonical.number}` : 'none'}.`
  );
  return result;
};

module.exports = {
  FIXER_LABEL,
  MERGED_LOOKBACK_DAYS,
  extractTestFilesFromText,
  findDuplicateFixPrs,
  graphqlWithRetry,
  isMeaningfulPath,
  pickCanonical,
  writeDuplicateCandidates,
};
