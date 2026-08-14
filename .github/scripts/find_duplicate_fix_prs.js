/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Same-team shortlist of Flaky Test Fixer PRs, for the fixer/verifier agent.
 *
 * The fixer opens one PR per `failed-test` issue, but many issues share a single root cause
 * (the same page-object method or spec), so it opens several PRs touching the same code —
 * usually within minutes, by parallel runs, before any sibling PR exists. Rather than hand
 * the agent every open fixer PR (hundreds), this shortlists the ones whose `failed-test`
 * issue is owned by the same team as the target, so the agent has a short, relevant set to
 * confirm against the diffs.
 *
 * Team is the signal because the fixer PRs themselves carry no `Team:` label, but the
 * `failed-test` issues they close reliably do (the reporter labels them from CODEOWNERS).
 * Two fixes for the same root cause touch the same file, which has one owning team, so their
 * issues share a `Team:` label — regardless of how the PR titles are worded. We read the
 * target's team from its issue, then find the team's `failed-test` issues in one search and
 * intersect with the linked-issue numbers we already parse from each PR — no per-issue fetch.
 * Matching the changed files (same method vs merely same file/team) is left to the agent,
 * which already has its own diff.
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'elastic';
const REPO = 'kibana';
const FIXER_LABEL = 'flaky-test-fixer';
const FAILED_TEST_LABEL = 'failed-test';
// A merged fix means the root cause already landed; older merges aren't in flight.
const MERGED_LOOKBACK_DAYS = 30;
// Buffer subtracted from the oldest in-flight PR's date to bound the team-issue search: a
// `failed-test` issue is created shortly before its fix PR, so this window covers every issue
// our PRs link while keeping the result under GitHub search's 1000-hit cap (busy teams have
// thousands of `failed-test` issues all-time, but only a few hundred in any recent window).
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

const teamLabelsOf = (labels) =>
  (labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter((name) => name?.startsWith('Team:'));

// Numbers of the `failed-test` issues owned by any of `teamLabels`, created since `sinceDate`.
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
 * Shortlist the `flaky-test-fixer` PRs likely to duplicate a target, by owning team. Pass
 * `prNumber` (verifier) or `issueNumber` (fixer). Reads the target's `failed-test` issue to
 * get its `Team:` label(s), then returns every fixer PR whose linked issue belongs to the
 * same team (or is the target's own issue), as `{ team, candidates }` sorted oldest-first.
 * Falls back to just the shared-linked-issue matches when the target has no team label.
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

  // The target's owning team comes from its failed-test issue (fixer PRs carry no Team label).
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

// Workflow pre-step: write `duplicate-candidates.json` into the agent's context dir — the
// `{ team, candidates }` same-team shortlist computed by `findDuplicateCandidates` — so the
// agent reads it as a file instead of re-deriving it.
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
