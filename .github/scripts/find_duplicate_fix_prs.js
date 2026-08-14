/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Narrowed list of likely-duplicate Flaky Test Fixer PRs, for the fixer/verifier agent.
 *
 * The fixer opens one PR per `failed-test` issue, but many issues share a single root cause
 * (the same page-object method or spec), so it opens several PRs touching the same code —
 * usually within minutes, by parallel runs, before any sibling PR exists. Rather than hand
 * the agent every open fixer PR (hundreds), this shortlists the ones whose title looks like
 * it targets the same test/method as the target, plus any sharing its linked issue, so the
 * agent has a short, relevant set to confirm against the diffs. Matching the changed files
 * is left to the agent, which already has its own diff. Titles are the signal because fixer
 * PR titles are derived from the test being fixed, so siblings share distinctive tokens
 * (measured ~98% recall on the known duplicate groups). The verifier — which runs per PR,
 * comparing PR title to PR title — is the reliable chokepoint; the fixer's issue-titled
 * target is best-effort, with the verifier as backstop for anything it misses.
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'elastic';
const REPO = 'kibana';
const FIXER_LABEL = 'flaky-test-fixer';
// A merged fix means the root cause already landed; older merges aren't in flight.
const MERGED_LOOKBACK_DAYS = 30;
// Shortlist rules: enough shared meaningful title tokens, or one shared token rare enough
// across all fixer PRs to stand alone (a distinctive component/method name, e.g. `editform`).
const MIN_SHARED_TOKENS = 2;
const RARE_DF = 3;

// Generic fix/flaky vocabulary and stopwords carry no root-cause signal, so they never seed
// a match — only the test/method/component words that distinguish one fix from another do.
const STOP = new Set(
  (
    'the a an to in on of by via and or for before after fix fixes fixed flaky flakiness test ' +
    'tests wait waits waiting make makes making resilient deterministic deterministically ' +
    'stabilize stabilise ensure ensures avoid avoids handle handles when with that this closes ' +
    'resolves failing e2e ftr ui spec already not up out first then also more its it be is are ' +
    'was were has have selection run runs running check checks checked retry retries via'
  ).split(/\s+/)
);

// Meaningful title tokens: drop the leading `[Area]`, lowercase, split on non-alphanumerics,
// then drop stopwords, pure numbers, and very short tokens.
const tokenize = (title) =>
  (title || '')
    .toLowerCase()
    .replace(/^\[[^\]]*\]\s*/, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !STOP.has(token));

// Tokens match when equal, or when one contains the other (>=5 chars), so morphological
// variants still count (commit/committing, dimension/configureDimension).
const tokensMatch = (a, b) =>
  a === b || (a.length >= 5 && b.includes(a)) || (b.length >= 5 && a.includes(b));

const sharedTokenCount = (a, b) => {
  const used = new Set();
  let count = 0;
  for (const tokenA of a) {
    for (let i = 0; i < b.length; i++) {
      if (!used.has(i) && tokensMatch(tokenA, b[i])) {
        used.add(i);
        count++;
        break;
      }
    }
  }
  return count;
};

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

// Every flaky-test-fixer PR that could still be work in flight for a root cause: every open
// one, plus anything merged in the recent lookback window (a merge means the fix landed).
const fetchFixerPrs = async (github) => {
  const cutoff = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
  const base = `repo:${OWNER}/${REPO} is:pr label:${FIXER_LABEL}`;
  const [open, merged] = await Promise.all([
    searchPrs(github, `${base} is:open`, 'OPEN'),
    searchPrs(github, `${base} is:merged merged:>=${cutoff}`, 'MERGED'),
  ]);
  return [...open, ...merged];
};

/**
 * Shortlist the `flaky-test-fixer` PRs that likely duplicate a target. Pass `prNumber`
 * (verifier: match its PR title) or `issueNumber` (fixer: match the issue title, and always
 * include PRs that close this issue). Returns `{ candidates }` sorted oldest-first, each with
 * `number`, `title`, `state`, `createdAt`, `url`, `linkedIssues`, and the `sharedTokens`
 * count that shortlisted it (0 when included only via a shared linked issue).
 */
const findDuplicateCandidates = async ({ github, prNumber, issueNumber }) => {
  const fixerPrs = await fetchFixerPrs(github);

  // Document frequency across all fixer PRs, so a rare shared token can stand on its own.
  const df = {};
  for (const pr of fixerPrs) {
    for (const token of new Set(tokenize(pr.title))) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  let targetTitle = '';
  let targetIssues = [];
  if (prNumber != null) {
    const self = fixerPrs.find((pr) => pr.number === prNumber);
    if (self) {
      targetTitle = self.title;
      targetIssues = self.linkedIssues;
    } else {
      // A just-opened PR may not be search-indexed yet; fall back to a direct read.
      const { data } = await github.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: prNumber,
      });
      targetTitle = data.title;
      targetIssues = linkedIssuesFromBody(data.body);
    }
  } else if (issueNumber != null) {
    targetIssues = [issueNumber];
    const { data } = await github.rest.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });
    targetTitle = data.title;
  } else {
    throw new Error('findDuplicateCandidates requires either prNumber or issueNumber');
  }

  const targetTokens = tokenize(targetTitle);
  const sharesRareToken = (tokens) =>
    targetTokens.some(
      (token) =>
        token.length >= 6 &&
        (df[token] || 0) <= RARE_DF &&
        tokens.some((other) => tokensMatch(token, other))
    );

  const candidates = fixerPrs
    .filter((pr) => pr.number !== prNumber)
    .map((pr) => {
      const sharedTokens = sharedTokenCount(targetTokens, tokenize(pr.title));
      const sharesIssue = pr.linkedIssues.some((issue) => targetIssues.includes(issue));
      const related =
        sharesIssue || sharedTokens >= MIN_SHARED_TOKENS || sharesRareToken(tokenize(pr.title));
      return related ? { ...pr, sharedTokens } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { candidates };
};

// Workflow pre-step: run the shortlist and drop the result where the agent can read it.
const writeDuplicateCandidates = async ({
  github,
  core,
  outputDir = '/tmp/gh-aw/agent',
  prNumber,
  issueNumber,
}) => {
  const result = await findDuplicateCandidates({ github, prNumber, issueNumber });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'duplicate-candidates.json'),
    `${JSON.stringify(result, null, 2)}\n`
  );
  const target = prNumber != null ? `PR #${prNumber}` : `issue #${issueNumber}`;
  (core?.info ?? console.log)(
    `Duplicate detector: ${result.candidates.length} candidate(s) shortlisted for ${target}.`
  );
  return result;
};

module.exports = { findDuplicateCandidates, writeDuplicateCandidates };
