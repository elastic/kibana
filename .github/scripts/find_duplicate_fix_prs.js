/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Shortlists Flaky Test Fixer PRs that may duplicate a target, for the fixer/verifier agent.
 *
 * Parallel fixer runs often open several PRs for one root cause within minutes, before any
 * sibling exists — so a "is a PR already open?" check misses them. Instead of handing the agent
 * every open fixer PR (hundreds), we shortlist those whose `failed-test` issue shares the
 * target's owning team, then let the agent confirm real duplicates against the diffs.
 *
 * Team is the signal: fixer PRs carry no ownership label, but the `failed-test` issues they
 * close do (labeled from CODEOWNERS), and same-root-cause fixes touch one team's files. We read
 * the target's team from its issue, list that team's recent `failed-test` issues in one search,
 * and intersect with the linked issues we already parse from each PR — no per-issue fetch.
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'elastic';
const REPO = 'kibana';
const FIXER_LABEL = 'flaky-test-fixer';
const FAILED_TEST_LABEL = 'failed-test';
// A merge means the fix landed; only recent merges still count as in flight.
const MERGED_LOOKBACK_DAYS = 30;
// Bounds the team-issue search back from the oldest in-flight PR: wide enough to cover every
// issue our PRs link, tight enough to stay under GitHub search's 1000-hit cap.
const TEAM_ISSUE_BUFFER_DAYS = 14;

const linkedIssuesFromBody = (body) => [
  ...new Set(
    [...(body || '').matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map(
      (match) => Number(match[1])
    )
  ),
];

const searchIssues = async (github, q) =>
  github.paginate(github.rest.search.issuesAndPullRequests, { q, per_page: 100 });

const searchPrs = async (github, q, state) => {
  const items = await searchIssues(github, q);
  return items.map((item) => ({
    number: item.number,
    title: item.title,
    url: item.html_url,
    state,
    createdAt: item.created_at,
    linkedIssues: linkedIssuesFromBody(item.body),
  }));
};

// All fixer PRs that could still be in flight: every open one, plus recent merges.
const fetchFixerPrs = async (github) => {
  const cutoff = new Date(Date.now() - MERGED_LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
  const base = `repo:${OWNER}/${REPO} is:pr label:${FIXER_LABEL}`;
  const [open, merged] = await Promise.all([
    searchPrs(github, `${base} is:open`, 'OPEN'),
    searchPrs(github, `${base} is:merged merged:>=${cutoff}`, 'MERGED'),
  ]);
  return [...open, ...merged];
};

// A team surfaces as either a `Team:*` label (allowing stray spaces, e.g. `Team: SecuritySolution`)
// or a legacy colon-prefixed area label (e.g. ML's `:ml`, used instead of `Team:ML`). Match both.
const isTeamLabel = (name) => /^team\s*:/i.test(name) || name.startsWith(':');

const teamLabelsOf = (labels) =>
  (labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter((name) => name && isTeamLabel(name));

// `failed-test` issue numbers owned by any of `teamLabels`, created since `sinceDate`.
const fetchTeamIssueNumbers = async (github, teamLabels, sinceDate) => {
  const numbers = new Set();
  for (const teamLabel of teamLabels) {
    const q = `repo:${OWNER}/${REPO} is:issue label:${FAILED_TEST_LABEL} label:"${teamLabel}" created:>=${sinceDate}`;
    for (const issue of await searchIssues(github, q)) {
      numbers.add(issue.number);
    }
  }
  return numbers;
};

/**
 * Shortlist `flaky-test-fixer` PRs likely to duplicate a target, by owning team. Pass
 * `prNumber` (verifier) or `issueNumber` (fixer). Returns `{ team, candidates }` with candidates
 * sorted oldest-first. Falls back to shared-linked-issue matches when the target has no team.
 */
const findDuplicateCandidates = async ({ github, prNumber, issueNumber }) => {
  const fixerPrs = await fetchFixerPrs(github);

  let targetIssues;
  if (prNumber != null) {
    const self = fixerPrs.find((pr) => pr.number === prNumber);
    if (self) {
      targetIssues = self.linkedIssues;
    } else {
      // A just-opened PR may not be search-indexed yet; fall back to a direct read.
      const { data } = await github.rest.pulls.get({
        owner: OWNER,
        repo: REPO,
        pull_number: prNumber,
      });
      targetIssues = linkedIssuesFromBody(data.body);
    }
  } else if (issueNumber != null) {
    targetIssues = [issueNumber];
  } else {
    throw new Error('findDuplicateCandidates requires either prNumber or issueNumber');
  }

  // Owning team lives on the failed-test issue, not the PR.
  let teamLabels = [];
  const targetIssue = issueNumber ?? targetIssues[0];
  if (targetIssue != null) {
    const { data } = await github.rest.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: targetIssue,
    });
    teamLabels = teamLabelsOf(data.labels);
  }

  let teamIssues = new Set();
  if (teamLabels.length > 0 && fixerPrs.length > 0) {
    const oldest = fixerPrs.reduce(
      (min, pr) => (pr.createdAt < min ? pr.createdAt : min),
      fixerPrs[0].createdAt
    );
    const since = new Date(new Date(oldest).getTime() - TEAM_ISSUE_BUFFER_DAYS * 864e5)
      .toISOString()
      .slice(0, 10);
    teamIssues = await fetchTeamIssueNumbers(github, teamLabels, since);
  }

  const candidates = fixerPrs
    .filter(
      (pr) =>
        pr.number !== prNumber &&
        pr.linkedIssues.some((issue) => teamIssues.has(issue) || targetIssues.includes(issue))
    )
    .map(({ number, title, state, createdAt, url, linkedIssues }) => ({
      number,
      title,
      state,
      createdAt,
      url,
      linkedIssues,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { team: teamLabels, candidates };
};

// Workflow pre-step: write the `{ team, candidates }` shortlist to `duplicate-candidates.json`
// in the agent's context dir, so the agent reads it as a file instead of recomputing it.
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
  const team = result.team.length ? result.team.join(', ') : 'unknown';
  (core?.info ?? console.log)(
    `Duplicate detector: ${result.candidates.length} candidate(s) for ${target} (team: ${team}).`
  );
  return result;
};

module.exports = { findDuplicateCandidates, writeDuplicateCandidates };
