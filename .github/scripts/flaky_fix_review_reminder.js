/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Sweep logic for the "flaky fix review reminder" workflow.
//
// It finds open, ready-for-review PRs labeled `flaky-test-fixer` that have gone
// without a human review for at least REMINDER_AFTER_DAYS days and pings the
// codeowners of the changed files, re-pinging on the same cadence until a
// review lands. These PRs are opened by a bot with no human author behind them,
// so without a nudge they routinely sit unreviewed.

const fs = require('fs');
const path = require('path');
// `ignore` is the same gitignore-semantics matcher used by @kbn/code-owners, so
// codeowner resolution here matches the rest of the repo exactly. It is a tiny,
// dependency-free package installed by the workflow before this script runs.
const ignore = require('ignore');

const LABEL = 'flaky-test-fixer';
const REMINDER_MARKER = '<!-- flaky-fix-review-reminder -->';
// The bot that authors our reminder comments (default GITHUB_TOKEN identity).
const REMINDER_AUTHOR = 'github-actions[bot]';
// Days a PR may sit without a human review before we ping, and the cadence at
// which we re-ping afterwards. Calendar days, weekends included.
const REMINDER_AFTER_DAYS = 4;
// Cap pings per run to avoid a notification storm / secondary rate limits on the
// first sweep over the backlog.
const MAX_PINGS_PER_RUN = 50;
// Used when no codeowner can be resolved for the changed files.
const FALLBACK_OWNER = '@elastic/kibana-qa';
const CODEOWNERS_PATH = path.resolve(process.cwd(), '.github/CODEOWNERS');
const QA_CHANNEL_URL = 'https://elastic.slack.com/archives/CTH3RN2GB';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between an instant and now (calendar days, weekends included). */
function daysBetween(fromIso, now = Date.now()) {
  const to = now instanceof Date ? now.getTime() : now;
  return Math.floor((to - new Date(fromIso).getTime()) / MS_PER_DAY);
}

/** The later of two ISO timestamps; tolerates either being null. */
function laterOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Build codeowner entries from a CODEOWNERS file, mirroring @kbn/code-owners:
 * each entry gets its own `ignore` matcher, and entries are reversed so the
 * last matching line in the file wins (GitHub's precedence rule).
 */
function buildCodeownersEntries(contents) {
  const entries = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    // Backport branches override ownership with `* @kibanamachine`; ignore it.
    if (/^\*\s+@kibanamachine$/.test(line)) {
      continue;
    }
    const [pattern, ...owners] = line.replace(/#.*$/, '').trim().split(/\s+/);
    if (!pattern) {
      continue;
    }
    entries.push({
      owners: owners.filter((o) => o.startsWith('@')),
      matcher: ignore().add(pattern.replace(/\/$/, '')),
    });
  }
  return entries.reverse();
}

/** Owning team handles for a set of changed files, de-duplicated in first-seen order. */
function resolveOwners(entries, files) {
  const owners = new Set();
  for (const file of files) {
    const normalized = file.replace(/^\/+/, '');
    const match = entries.find((entry) => entry.matcher.test(normalized).ignored);
    if (match) {
      match.owners.forEach((o) => owners.add(o));
    }
  }
  return [...owners];
}

function buildCommentBody(ownerHandles) {
  const mentions = ownerHandles.length ? ownerHandles.join(' ') : FALLBACK_OWNER;
  return [
    `Hey ${mentions} — could you please review this flaky-fix PR?`,
    '',
    '**Recommendations:**',
    `- Ask for help in the [#kibana-qa](${QA_CHANNEL_URL}) channel if you have any questions`,
    '- Mention `@copilot` if you need to make quick changes',
    "- Close the PR if you don't find the fix valuable (you can leave a comment to explain why)",
    '',
    REMINDER_MARKER,
  ].join('\n');
}

const isBot = (user) =>
  Boolean(user) && (user.type === 'Bot' || user.login.endsWith('[bot]'));

/**
 * Whether the PR has a review that should stop reminders: a human (non-author,
 * non-bot) APPROVED / CHANGES_REQUESTED / COMMENTED review. PENDING and
 * DISMISSED reviews do not count.
 */
async function hasHumanReview({ github, owner, repo, pr }) {
  const reviews = await github.paginate(github.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  return reviews.some(
    (review) =>
      ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED'].includes(review.state) &&
      review.user &&
      review.user.login !== pr.user.login &&
      !isBot(review.user)
  );
}

/** Instant the PR became ready for review, falling back to its creation time. */
async function getReadyForReviewTime({ github, owner, repo, pr }) {
  const events = await github.paginate(github.rest.issues.listEventsForTimeline, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  });
  let readyAt = null;
  for (const event of events) {
    if (event.event === 'ready_for_review' && event.created_at) {
      readyAt = event.created_at; // keep the most recent
    }
  }
  return readyAt || pr.created_at;
}

/** Timestamp of the most recent reminder we posted, or null if we never have. */
async function getLastReminderTime({ github, owner, repo, prNumber }) {
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  let lastAt = null;
  for (const comment of comments) {
    if (
      comment.user &&
      comment.user.login === REMINDER_AUTHOR &&
      comment.body &&
      comment.body.includes(REMINDER_MARKER)
    ) {
      lastAt = comment.created_at;
    }
  }
  return lastAt;
}

module.exports = async function flakyFixReviewReminder({ github, context, core }) {
  const { owner, repo } = context.repo;
  const dryRun = process.env.DRY_RUN === 'true';

  const entries = buildCodeownersEntries(fs.readFileSync(CODEOWNERS_PATH, 'utf8'));

  // CODEOWNERS is read from the checked-out ref (the default branch), so we only
  // reason about PRs that target it. flaky-test-fixer PRs are opened against the
  // default branch, so this is a no-op guard in practice.
  const { data: repository } = await github.rest.repos.get({ owner, repo });
  const baseBranch = repository.default_branch;

  // Server-side label filter keeps this cheap even though the repo has hundreds
  // of open PRs (mirrors close-stale-failed-test-issues.yml).
  const candidates = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    labels: LABEL,
    per_page: 100,
  });

  let pinged = 0;
  let considered = 0;

  for (const candidate of candidates) {
    if (!candidate.pull_request) {
      continue;
    }
    if (pinged >= MAX_PINGS_PER_RUN) {
      core.info(`Reached the limit of ${MAX_PINGS_PER_RUN} pings, stopping`);
      break;
    }

    const { data: pr } = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: candidate.number,
    });
    if (pr.draft || pr.base.ref !== baseBranch) {
      continue;
    }
    considered += 1;

    if (await hasHumanReview({ github, owner, repo, pr })) {
      continue;
    }

    const readyAt = await getReadyForReviewTime({ github, owner, repo, pr });
    const lastReminderAt = await getLastReminderTime({ github, owner, repo, prNumber: pr.number });
    const reference = laterOf(readyAt, lastReminderAt);
    const elapsed = daysBetween(reference);
    if (elapsed < REMINDER_AFTER_DAYS) {
      continue;
    }

    const files = await github.paginate(github.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100,
    });
    const owners = resolveOwners(entries, files.map((f) => f.filename));
    const mentioned = owners.length ? owners.join(' ') : FALLBACK_OWNER;

    if (dryRun) {
      pinged += 1;
      core.info(`[dry run] would ping #${pr.number} (${elapsed}d since ${reference}) -> ${mentioned}`);
      continue;
    }

    // Re-check freshness right before commenting to narrow races with reviews,
    // label removals, and conversions back to draft.
    const { data: fresh } = await github.rest.pulls.get({ owner, repo, pull_number: pr.number });
    const freshLabels = fresh.labels.map((l) => (typeof l === 'string' ? l : l.name));
    if (
      fresh.state !== 'open' ||
      fresh.draft ||
      !freshLabels.includes(LABEL) ||
      (await hasHumanReview({ github, owner, repo, pr: fresh }))
    ) {
      continue;
    }

    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body: buildCommentBody(owners),
    });
    pinged += 1;
    core.info(`Pinged #${pr.number} (${elapsed}d since ${reference}) -> ${mentioned}`);
  }

  core.info(
    `Checked ${considered} open ready "${LABEL}" PR(s), pinged ${pinged}${dryRun ? ' (dry run)' : ''}`
  );
};

// Exported for unit testing.
module.exports.daysBetween = daysBetween;
module.exports.laterOf = laterOf;
module.exports.buildCodeownersEntries = buildCodeownersEntries;
module.exports.resolveOwners = resolveOwners;
module.exports.buildCommentBody = buildCommentBody;
module.exports.REMINDER_AFTER_DAYS = REMINDER_AFTER_DAYS;
module.exports.REMINDER_MARKER = REMINDER_MARKER;
