/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const helpText = `Usage:
  node triage/label-reconcile.js \\
    --shipped <tag> \\
    --upcoming <label> \\
    [--dry-run]

Options:
  --shipped     Tag of the release that has already shipped, in the form
                vMAJOR.MINOR.PATCH (e.g. v9.4.0). The release branch is
                derived by stripping the patch component (e.g. 9.4), and
                commits between <tag>..<branch> are reconciled.
  --upcoming    Target version label for PRs that landed on the branch after
                the tag was cut (e.g. v9.4.1); same vMAJOR.MINOR.PATCH form.
  --dry-run     Print planned changes without modifying any labels.
  --help, -h    Show this help message.

Behaviour:
  Compares commits between the shipped tag and the HEAD of its release branch.
  For every PR in that gap, any label matching the version series of --shipped
  (derived from the first component that differs from --upcoming) is replaced
  with --upcoming. PRs already carrying --upcoming are left untouched, PRs
  carrying a label newer than --upcoming are skipped (no downgrade), and PRs
  with no matching version label are reported as warnings.

Environment:
  GITHUB_TOKEN  Required. GitHub personal access token with repo scope.

Example:
  GITHUB_TOKEN=ghp_xxx node triage/label-reconcile.js \\
    --shipped v9.4.0 \\
    --upcoming v9.4.1 \\
    --dry-run
`;

const { parseArgs } = require('util');
const { Octokit } = require('@octokit/rest');

const OWNER = 'elastic';
const REPO = 'kibana';
const PR_NUMBER_RE = /\(#(\d+)\)/;
const VERSION_LABEL_RE = /^v(\d+)\.(\d+)\.(\d+)$/;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main({ shipped, branch, upcoming, dryRun, octokit, pattern }) {
  console.log(`\nRange: ${shipped}..${branch}`);
  console.log(`Label pattern: ${pattern.description} (regex: ${pattern.regex})`);

  const prNumbers = await queryPRs(octokit, shipped, branch);
  const results = await applyLabels(
    octokit,
    prNumbers,
    { regex: pattern.regex, newLabel: upcoming },
    dryRun
  );
  logResults(results, { shipped, branch, pattern, upcoming, dryRun });
}

// ── Steps ────────────────────────────────────────────────────────────────────

function parseArguments() {
  const { values: opts } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean', default: false },
      shipped: { type: 'string' },
      upcoming: { type: 'string' },
    },
    strict: false,
  });

  if (opts.help) {
    console.log(helpText);
    process.exit(0);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is required.');
    process.exit(1);
  }

  const missing = [];
  if (!opts.shipped) missing.push('--shipped');
  if (!opts.upcoming) missing.push('--upcoming');
  if (missing.length > 0) {
    console.error(`Error: missing required flags: ${missing.join(', ')}`);
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  const shipped = opts.shipped;
  const upcoming = opts.upcoming;

  if (shipped === upcoming) {
    console.error('Error: --shipped and --upcoming must differ');
    process.exit(1);
  }

  let pattern;
  let branch;
  try {
    const shippedV = parseVersionLabel(shipped);
    branch = `${shippedV.major}.${shippedV.minor}`; // release branch
    pattern = derivePattern(shipped, upcoming);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  return {
    shipped,
    branch,
    upcoming,
    dryRun: opts['dry-run'],
    octokit: new Octokit({ auth: token }),
    pattern,
  };
}

async function queryPRs(octokit, from, to) {
  console.log(`\nFinding commits in range ${from}..${to}...`);

  let commits;
  try {
    commits = await getCommitsInRange(octokit, from, to);
  } catch (err) {
    console.error(`Error: failed to fetch commits from GitHub API — ${err.message}`);
    process.exit(1);
  }

  if (commits.length === 0) {
    console.log('No commits found in the range. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${commits.length} commit(s) in the gap.`);

  const prNumbers = new Set();
  const skipped = [];
  for (const commit of commits) {
    const prNumber = extractPrNumber(commit.message);
    if (prNumber) prNumbers.add(prNumber);
    else skipped.push(commit);
  }

  if (skipped.length > 0) {
    console.log(`\nWarning: ${skipped.length} commit(s) without a PR number:`);
    for (const c of skipped) console.log(`  ${c.sha.slice(0, 8)} ${c.message}`);
  }

  if (prNumbers.size === 0) {
    console.log('\nNo PRs found in the gap. Nothing to do.');
    process.exit(0);
  }

  console.log(
    `\nFound ${prNumbers.size} unique PR(s): ${[...prNumbers].map((n) => `#${n}`).join(', ')}`
  );
  return prNumbers;
}

async function applyLabels(octokit, prNumbers, { regex, newLabel }, dryRun) {
  if (dryRun) console.log('\n=== DRY RUN MODE — no labels will be modified ===\n');

  const results = {
    affected: [],
    alreadyCorrect: [],
    skippedNewer: [],
    noMatchingLabel: [],
    errors: [],
  };

  for (const prNumber of prNumbers) {
    try {
      const { data: labels } = await octokit.issues.listLabelsOnIssue({
        owner: OWNER,
        repo: REPO,
        issue_number: prNumber,
      });

      const labelNames = labels.map((l) => l.name);
      const matching = labelNames.filter((name) => regex.test(name));

      const newer = matching.filter((name) => isNewer(name, newLabel));
      if (newer.length > 0) {
        console.log(
          `  #${prNumber}: has newer label(s) ${newer.join(', ')} — skipping (would be downgrade)`
        );
        results.skippedNewer.push(prNumber);
        continue;
      }

      if (matching.length === 1 && matching[0] === newLabel) {
        console.log(`  #${prNumber}: already has ${newLabel} — skipping`);
        results.alreadyCorrect.push(prNumber);
        continue;
      }

      if (matching.length === 0) {
        console.log(
          `  #${prNumber}: no matching version label (labels: ${
            labelNames.join(', ') || '(none)'
          }) — skipping`
        );
        results.noMatchingLabel.push(prNumber);
        continue;
      }

      const toRemove = matching.filter((l) => l !== newLabel);
      const hasNewLabel = labelNames.includes(newLabel);

      if (dryRun) {
        console.log(`  #${prNumber}: would remove ${toRemove.join(', ')} → ${newLabel}`);
      } else {
        for (const name of toRemove) await removeLabelSafe(octokit, prNumber, name);
        if (!hasNewLabel) {
          await octokit.issues.addLabels({
            owner: OWNER,
            repo: REPO,
            issue_number: prNumber,
            labels: [newLabel],
          });
        }
        console.log(`  #${prNumber}: ${toRemove.join(', ')} → ${newLabel}`);
      }

      results.affected.push(prNumber);
    } catch (err) {
      const status = err.status || err.code || 'unknown';
      console.error(`  #${prNumber}: ERROR (${status}) — ${err.message}`);
      results.errors.push({ prNumber, error: err.message });
    }
  }

  return results;
}

function logResults(results, { shipped, branch, pattern, upcoming, dryRun }) {
  const total =
    results.affected.length +
    results.alreadyCorrect.length +
    results.skippedNewer.length +
    results.noMatchingLabel.length +
    results.errors.length;

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Range:             ${shipped}..${branch}`);
  console.log(`  Label pattern:     ${pattern.description}`);
  console.log(`  Upcoming label:    ${upcoming}`);
  console.log(`  Dry run:           ${dryRun}`);
  console.log(`  Total PRs:         ${total}`);
  console.log(`  ${dryRun ? 'Would fix' : 'Fixed'}:         ${results.affected.length}`);
  console.log(`  Already OK:        ${results.alreadyCorrect.length}`);
  console.log(`  Skipped (newer):   ${results.skippedNewer.length}`);
  console.log(`  No matching label: ${results.noMatchingLabel.length}`);
  console.log(`  Errors:            ${results.errors.length}`);

  if (results.affected.length > 0) {
    console.log(
      `\n  ${dryRun ? 'Would fix' : 'Fixed'}:\n    ${results.affected
        .map((n) => `https://github.com/${OWNER}/${REPO}/pull/${n}`)
        .join('\n    ')}`
    );
  }
  if (results.skippedNewer.length > 0) {
    console.log(
      `\n  Skipped (newer label):\n    ${results.skippedNewer
        .map((n) => `https://github.com/${OWNER}/${REPO}/pull/${n}`)
        .join('\n    ')}`
    );
  }
  if (results.noMatchingLabel.length > 0) {
    console.log(
      `\n  No matching label:\n    ${results.noMatchingLabel
        .map((n) => `https://github.com/${OWNER}/${REPO}/pull/${n}`)
        .join('\n    ')}`
    );
  }
  if (results.errors.length > 0) {
    console.log(
      `\n  Errors: ${results.errors.map((e) => `#${e.prNumber} (${e.error})`).join(', ')}`
    );
  }
  console.log('');

  if (results.errors.length > 0) process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseVersionLabel(label) {
  const m = label.match(VERSION_LABEL_RE);
  if (!m) {
    throw new Error(`Invalid version label "${label}": expected vMAJOR.MINOR.PATCH (e.g. v9.4.0)`);
  }
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function isNewer(labelA, labelB) {
  const a = parseVersionLabel(labelA);
  const b = parseVersionLabel(labelB);
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

function derivePattern(oldLabel, newLabel) {
  const oldV = parseVersionLabel(oldLabel);
  const newV = parseVersionLabel(newLabel);
  const firstDiff = ['major', 'minor', 'patch'].find((c) => oldV[c] !== newV[c]);

  if (firstDiff === 'patch') {
    return {
      regex: new RegExp(`^v${oldV.major}\\.${oldV.minor}\\.\\d+$`),
      description: `v${oldV.major}.${oldV.minor}.* (patch changed)`,
    };
  }
  if (firstDiff === 'minor') {
    return {
      regex: new RegExp(`^v${oldV.major}\\.\\d+\\.\\d+$`),
      description: `v${oldV.major}.*.* (minor changed)`,
    };
  }
  return {
    regex: new RegExp(`^v(${oldV.major}|${newV.major})\\.\\d+\\.\\d+$`),
    description: `v${oldV.major}.*.* / v${newV.major}.*.* (major changed)`,
  };
}

async function removeLabelSafe(octokit, prNumber, name) {
  try {
    await octokit.issues.removeLabel({ owner: OWNER, repo: REPO, issue_number: prNumber, name });
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

async function getCommitsInRange(octokit, fromRef, toRef) {
  return octokit.paginate(
    octokit.repos.compareCommits,
    {
      owner: OWNER,
      repo: REPO,
      base: fromRef,
      head: toRef,
      per_page: 250,
    },
    (response) =>
      (response.data.commits || []).map((c) => ({
        sha: c.sha,
        message: c.commit.message.split('\n')[0],
      }))
  );
}

function extractPrNumber(message) {
  const match = message.match(PR_NUMBER_RE);
  return match ? parseInt(match[1], 10) : null;
}

// ── Entry point ──────────────────────────────────────────────────────────────

if (require.main === module) {
  const config = parseArguments();
  main(config).catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = { parseVersionLabel, derivePattern, parseArguments, main };
