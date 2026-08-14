/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Deterministic list of in-flight Flaky Test Fixer PRs, for duplicate detection.
 *
 * The fixer opens one PR per `failed-test` issue, but many issues share a single root
 * cause (the same page-object method or spec), so it opens several PRs touching the same
 * code — usually within minutes, by parallel runs, before any sibling PR exists. This
 * hands the fixer/verifier agent a complete, deterministic list of the other
 * `flaky-test-fixer` PRs (every open one, plus anything merged recently) so it can spot a
 * duplicate from the titles and linked issues and confirm it against the diffs, instead of
 * relying on an ad-hoc search that misses siblings. Matching the changed files is left to
 * the agent, which already has its own diff and inspects candidates' diffs to confirm.
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'elastic';
const REPO = 'kibana';
const FIXER_LABEL = 'flaky-test-fixer';
// A merged fix means the root cause already landed; older merges aren't in flight.
const MERGED_LOOKBACK_DAYS = 30;

// Issues a PR closes, from the `Fixes/Closes/Resolves #N` keywords in its body.
const linkedIssuesFromBody = (body) => [
  ...new Set(
    [...(body || '').matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map(
      (match) => Number(match[1])
    )
  ),
];

const searchPrs = async (github, q, state) => {
  const items = await github.paginate(github.rest.search.issuesAndPullRequests, {
    q,
    per_page: 100,
  });
  return items.map((item) => ({
    number: item.number,
    title: item.title,
    url: item.html_url,
    state,
    createdAt: item.created_at,
    linkedIssues: linkedIssuesFromBody(item.body),
  }));
};

/**
 * List the `flaky-test-fixer` PRs that could still represent work in flight for a root
 * cause: every open PR, plus anything merged in the recent lookback window. Sorted
 * oldest-first so the agent can read the earliest-created (canonical) one off the top.
 */
const listFixerPrs = async (github) => {
  const cutoff = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
  const base = `repo:${OWNER}/${REPO} is:pr label:${FIXER_LABEL}`;
  const [open, merged] = await Promise.all([
    searchPrs(github, `${base} is:open`, 'OPEN'),
    searchPrs(github, `${base} is:merged merged:>=${cutoff}`, 'MERGED'),
  ]);
  return [...open, ...merged].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

// Workflow pre-step: write the list where the agent can read it.
const writeDuplicateCandidates = async ({ github, core, outputDir = '/tmp/gh-aw/agent' }) => {
  const candidates = await listFixerPrs(github);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'duplicate-candidates.json'),
    `${JSON.stringify({ candidates }, null, 2)}\n`
  );
  (core?.info ?? console.log)(
    `Duplicate detector: listed ${candidates.length} flaky-test-fixer PR(s).`
  );
  return candidates;
};

module.exports = { listFixerPrs, writeDuplicateCandidates };
