/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Finds open, ready-for-review PRs labeled `flaky-test-fixer` with no human
// review for REMINDER_AFTER_DAYS days and pings the codeowners of the changed
// files, re-pinging on the same cadence until a review lands.

const fs = require('fs');
const path = require('path');
// Same gitignore-semantics matcher as @kbn/code-owners.
const ignore = require('ignore');

const LABEL = 'flaky-test-fixer';
const REMINDER_MARKER = '<!-- flaky-fix-review-reminder -->';
// must be kibanamachine (github-actions wouldn't send the notification to the team)
const REMINDER_AUTHOR = 'kibanamachine';
// Calendar days (weekends included) before the first ping; also the re-ping cadence.
const REMINDER_AFTER_DAYS = 4;
// Max reminder comments posted per run. Bounds the noise (and API writes) of a
// single sweep: with a large unreviewed backlog, at most this many PRs get a
// codeowner ping per day; the rest are picked up on subsequent daily runs.
// Temporary, will be increased as soon as we validate the workflow.
const MAX_PINGS_PER_RUN = 1;
const DEFAULT_CODEOWNERS_PATH = path.resolve(process.cwd(), '.github/CODEOWNERS');
const QA_CHANNEL_URL = 'https://elastic.slack.com/archives/C04HT4P1YS3';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days between an instant and now. */
function daysBetween(fromIso, now = Date.now()) {
  const to = now instanceof Date ? now.getTime() : now;
  return Math.floor((to - new Date(fromIso).getTime()) / MS_PER_DAY);
}

function laterOf(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Parse CODEOWNERS into per-line `ignore` matchers, reversed so the last
 * matching line wins (GitHub's precedence rule), mirroring @kbn/code-owners.
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
  const mentions = ownerHandles.join(' ');
  return [
    `Hey ${mentions} 👋 this flaky test fix has been open for a while and needs an owner decision.`,
    '',
    '**Hints:**',
    '',
    '- ✅ Review and merge if it looks good',
    '- ✏️ Need to make changes to or resolve merge conflicts? Ask `@copilot`',
    '- ❌ Not worth shipping? Just close it (drop a comment to help our workflow improve)',
    '',
    `Questions? Find the Applications DX team in [#kibana-qa](${QA_CHANNEL_URL}).`,
    '',
    REMINDER_MARKER,
  ].join('\n');
}

const isBot = (user) => Boolean(user) && (user.type === 'Bot' || user.login.endsWith('[bot]'));

/**
 * Whether a human (non-author, non-bot) submitted an APPROVED /
 * CHANGES_REQUESTED / COMMENTED review; such a review stops reminders.
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
      readyAt = event.created_at;
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

  const entries = buildCodeownersEntries(
    fs.readFileSync(process.env.CODEOWNERS_PATH || DEFAULT_CODEOWNERS_PATH, 'utf8')
  );

  // CODEOWNERS comes from the checked-out default branch, so only consider PRs
  // targeting it (flaky-test-fixer PRs always do).
  const { data: repository } = await github.rest.repos.get({ owner, repo });
  const baseBranch = repository.default_branch;

  const candidates = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    labels: LABEL,
    sort: 'created',
    direction: 'asc',
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
    const owners = resolveOwners(
      entries,
      files.map((f) => f.filename)
    );
    if (owners.length === 0) {
      core.info(`No codeowners resolved for #${pr.number}, skipping`);
      continue;
    }
    const mentioned = owners.join(' ');

    if (dryRun) {
      pinged += 1;
      core.info(
        `[dry run] would ping #${pr.number} (${elapsed}d since ${reference}) -> ${mentioned}`
      );
      continue;
    }

    // Re-check freshness right before commenting to narrow races.
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
    `Checked ${considered} open ready "${LABEL}" PR(s), pinged ${pinged}${
      dryRun ? ' (dry run)' : ''
    }`
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
module.exports.MAX_PINGS_PER_RUN = MAX_PINGS_PER_RUN;
