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
 * The fixer opens one PR per `failed-test` issue, but many issues share a single root
 * cause (the same page-object method or spec), so it opens several PRs that touch the
 * same code — usually within minutes, by parallel runs, before any sibling PR exists.
 * Given a target (an issue about to be fixed, or a fix PR under verification), this lists
 * the other `flaky-test-fixer` PRs that touch the same file(s) or reference the same
 * issue, and picks one canonical PR for the group so callers converge on it even when
 * they run concurrently.
 */

const fs = require('fs');
const path = require('path');

const FIXER_LABEL = 'flaky-test-fixer';
// A merged fix means the root cause already landed; older merges aren't in flight.
const MERGED_LOOKBACK_DAYS = 30;

const parseRepo = (repoFullName) => {
  const [owner, repo] = (repoFullName ?? '').split('/');
  if (!owner || !repo) {
    throw new Error(`Expected REPO in owner/repo form, received: ${repoFullName}`);
  }
  return { owner, repo };
};

// GitHub's GraphQL search 502s intermittently on a repo this size; a couple of retries
// keep the verifier's one-shot detection from missing a duplicate over a transient error.
const graphql = async (github, query, variables) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await github.graphql(query, variables);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
};

const SEARCH = `
  query($q: String!, $cursor: String) {
    search(query: $q, type: ISSUE, first: 50, after: $cursor) {
      nodes {
        ... on PullRequest {
          number
          state
          url
          createdAt
          mergedAt
          files(first: 100) { nodes { path } }
          closingIssuesReferences(first: 20) { nodes { number } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const search = async (github, q) => {
  const prs = [];
  let cursor = null;
  do {
    const { search: page } = await graphql(github, SEARCH, { q, cursor });
    for (const node of page.nodes) {
      // Non-PR search hits come back as empty objects for this fragment.
      if (node?.number) {
        prs.push({
          number: node.number,
          state: node.state,
          url: node.url,
          createdAt: node.createdAt,
          mergedAt: node.mergedAt,
          files: (node.files?.nodes ?? []).map((file) => file.path).filter(Boolean),
          linkedIssues: (node.closingIssuesReferences?.nodes ?? []).map((issue) => issue.number),
        });
      }
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return prs;
};

// Every flaky-test-fixer PR that could still be work in flight for a root cause: all open
// ones, plus anything merged recently (a merge means the fix already landed).
const fetchFixerPrs = async (github, owner, repo) => {
  const cutoff = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
  const base = `repo:${owner}/${repo} is:pr label:${FIXER_LABEL}`;
  const [open, merged] = await Promise.all([
    search(github, `${base} is:open`),
    search(github, `${base} is:merged merged:>=${cutoff}`),
  ]);
  const byNumber = new Map();
  for (const pr of [...open, ...merged]) {
    byNumber.set(pr.number, pr);
  }
  return [...byNumber.values()];
};

// Test/spec paths named in a `failed-test` issue body — the fixer's target file(s) before
// any PR exists. Narrow on purpose, so a stray path mention doesn't widen the match.
const testFilesInText = (text) => [
  ...new Set(
    (text || '').match(/[\w./-]+\.(?:spec|test|cy)\.(?:ts|tsx|js)|[\w./-]*config[\w./-]*\.ts/g) ??
      []
  ),
];

// Earliest-created PR wins so concurrent callers converge without coordination; a merged
// member trumps every open one (the fix has already landed).
const pickCanonical = (members) => {
  const byCreated = (a, b) => a.createdAt.localeCompare(b.createdAt);
  const merged = members
    .filter((member) => member.state === 'MERGED')
    .sort((a, b) => (a.mergedAt ?? '').localeCompare(b.mergedAt ?? ''));
  const open = members.filter((member) => member.state === 'OPEN').sort(byCreated);
  return merged[0] ?? open[0] ?? members.slice().sort(byCreated)[0] ?? null;
};

const shared = (a, b) => a.filter((value) => b.includes(value));

/**
 * Find flaky-test-fixer PRs that duplicate a target. Pass `prNumber` (verifier) or
 * `issueNumber` with optional `issueBody`/`testFiles` (fixer). Returns the overlapping
 * `candidates` (sorted oldest-first), the deterministically-chosen `canonical` PR for the
 * group, and — in `prNumber` mode — whether the target itself is that canonical.
 */
const findDuplicateFixPrs = async ({
  github,
  repoFullName = process.env.REPO,
  prNumber,
  issueNumber,
  issueBody = '',
  testFiles = [],
}) => {
  const { owner, repo } = parseRepo(repoFullName);
  const fixerPrs = await fetchFixerPrs(github, owner, repo);

  let self = null;
  let targetFiles;
  let targetIssues;
  if (prNumber != null) {
    self = fixerPrs.find((pr) => pr.number === prNumber) ?? null;
    // Kickoff can run before the just-opened PR is search-indexed, so fall back to REST.
    targetFiles =
      self?.files ??
      (
        await github.paginate(github.rest.pulls.listFiles, {
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100,
        })
      )
        .map((file) => file.filename)
        .filter(Boolean);
    targetIssues = self?.linkedIssues ?? [];
  } else if (issueNumber != null) {
    targetIssues = [issueNumber];
    targetFiles = [...new Set([...testFiles, ...testFilesInText(issueBody)])];
  } else {
    throw new Error('findDuplicateFixPrs requires either prNumber or issueNumber');
  }

  const matches = fixerPrs.filter(
    (pr) =>
      pr.number !== prNumber &&
      (shared(targetFiles, pr.files).length > 0 || shared(targetIssues, pr.linkedIssues).length > 0)
  );

  const canonical = pickCanonical(self ? [self, ...matches] : matches);
  const candidates = matches
    .map((pr) => ({
      number: pr.number,
      state: pr.state,
      url: pr.url,
      createdAt: pr.createdAt,
      sharedFiles: shared(targetFiles, pr.files),
      sharedIssues: shared(targetIssues, pr.linkedIssues),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    candidates,
    canonical: canonical && {
      number: canonical.number,
      url: canonical.url,
      state: canonical.state,
    },
    isSelfCanonical: Boolean(self && canonical && canonical.number === self.number),
  };
};

// Workflow pre-step: run the detector and drop the result where the agent can read it.
const writeDuplicateCandidates = async ({
  github,
  core,
  outputDir = '/tmp/gh-aw/agent',
  prNumber,
  issueNumber,
  issueBody,
  testFiles,
}) => {
  const result = await findDuplicateFixPrs({ github, prNumber, issueNumber, issueBody, testFiles });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'duplicate-candidates.json'),
    `${JSON.stringify(result, null, 2)}\n`
  );
  const target = prNumber != null ? `PR #${prNumber}` : `issue #${issueNumber}`;
  const canonical = result.canonical ? `#${result.canonical.number}` : 'none';
  (core?.info ?? console.log)(
    `Duplicate detector: ${result.candidates.length} candidate(s) for ${target}; canonical ${canonical}.`
  );
  return result;
};

module.exports = { findDuplicateFixPrs, writeDuplicateCandidates };
