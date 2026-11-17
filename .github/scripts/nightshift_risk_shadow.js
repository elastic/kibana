/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shadow mode for low-risk auto-approval of Nightshift PRs. It labels and comments only;
// nothing here approves a PR. A PR is Low only when every changed file is owned only by
// @elastic/nightshift in CODEOWNERS AND matches a Low pattern below. Anything unknown counts
// as not Low.

const fs = require('fs');

const MARKER = '<!-- nightshift-risk-shadow -->';
const LABEL = 'nightshift:risk-low';
const OWNER = '@elastic/nightshift';

// Turns one CODEOWNERS pattern into a regex, following GitHub's rules: a pattern with a
// leading or inner slash is anchored at the repo root, otherwise it matches at any depth;
// `*` stays within one path segment and `**` crosses them; a pattern matches everything
// under a directory it names, except that `dir/*` matches only direct children.
const patternToRegex = (pattern) => {
  const trimmed = pattern.replace(/\/$/, '');
  const anchored = trimmed.startsWith('/') || trimmed.includes('/');
  const body = trimmed
    .replace(/^\//, '')
    .split('**')
    .map((part) =>
      part
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
    )
    .join('.*');
  const tail = /\/\*$/.test(trimmed) ? '$' : '(/|$)';
  return new RegExp(`${anchored ? '^' : '(^|/)'}${body}${tail}`);
};

// Returns a function from a file path to its owners. The last matching rule wins, and a
// rule with no owners leaves the file unowned.
const parseCodeowners = (text) => {
  const rules = text
    .split('\n')
    .map((line) => line.replace(/\s#.*$/, '').trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [pattern, ...owners] = line.split(/\s+/);
      return { regex: patternToRegex(pattern), owners };
    })
    .reverse();
  return (path) => rules.find((rule) => rule.regex.test(path))?.owners ?? [];
};

const TEST_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js)$/,
  /\.mock\.(ts|tsx)$/,
  /\/__mocks__\//,
  /\/test\//,
];

const LOW_PATTERNS = [
  ...TEST_PATTERNS,
  /\.stories\.tsx?$/,
  /\/__storybook__\//,
  // Eval data only: datasets, seed data, scenarios, data generators and snapshot scripts, in
  // any eval suite Nightshift owns. Judges, scorers, evaluators, their prompts and the eval
  // harness decide what results mean, so they are not Low (see the Medium tier in
  // .agents/skills/nightshift-review).
  /\/kbn-evals-suite-[^/]+\/(?!.*(judge|evaluat|scor|criteria|prompt|\.text$))(.*\/)?(datasets|seed_data|scenarios|data_generators|[^/]*_snapshots?)(\/|\.ts$)/,
  // Docs only. Instruction files for coding agents are not Low.
  /^(?!.*\/(AGENTS|CLAUDE|SKILL)\.md$).*\.md$/,
];

// Added lines that turn a test off or narrow a run. Covers Jest and Playwright/Scout
// spellings such as `it.skip(`, `test.describe.only(` and `apiTest.fixme(`.
const DISABLED_TEST =
  /^\+.*\b(?:(?:it|describe|\w*[tT]est)(?:\.\w+)*\.(?:skip|only|todo|fixme)|xit|xdescribe|xtest|fit|fdescribe)\s*\(/m;

const isTest = (path) => TEST_PATTERNS.some((re) => re.test(path));
const isLowPath = (path) => LOW_PATTERNS.some((re) => re.test(path));

// files: the shape returned by pulls.listFiles. totalFiles: the PR's changed_files count.
// ownersOf: a path-to-owners function from parseCodeowners.
const classify = (files, { totalFiles = files.length, authorAssociation, ownersOf }) => {
  const isNightshift = (path) => {
    const owners = ownersOf(path);
    return owners.length > 0 && owners.every((o) => o === OWNER);
  };
  const nightshiftFiles = files.filter(
    (f) => isNightshift(f.filename) || (f.previous_filename && isNightshift(f.previous_filename))
  );
  if (nightshiftFiles.length === 0) return { scope: 'none', tier: null, reasons: [] };

  const reasons = [];
  if (files.length < totalFiles) {
    reasons.push(`only ${files.length} of ${totalFiles} changed files could be listed`);
  }
  if (!['MEMBER', 'OWNER'].includes(authorAssociation)) {
    reasons.push('author is not an Elastic org member');
  }

  for (const f of files) {
    const paths = [f.filename, f.previous_filename].filter(Boolean);
    if (!paths.every(isNightshift)) {
      reasons.push(`\`${f.filename}\` isn't owned only by \`${OWNER}\``);
    } else if (!paths.every(isLowPath)) {
      reasons.push(`\`${f.filename}\` is not a test, story, eval data or doc file`);
    } else if (isTest(f.filename) && f.status === 'removed') {
      reasons.push(`\`${f.filename}\` deletes a test file`);
    } else if (isTest(f.filename) && f.patch === undefined && f.changes > 0) {
      reasons.push(`\`${f.filename}\` has no diff to check (too large or binary)`);
    } else if (isTest(f.filename) && DISABLED_TEST.test(f.patch ?? '')) {
      reasons.push(`\`${f.filename}\` skips or focuses a test`);
    }
  }

  return { scope: 'nightshift', tier: reasons.length === 0 ? 'low' : 'not_low', reasons };
};

const MAX_REASONS = 10;

const commentBody = ({ tier, reasons }) => {
  const head =
    tier === 'low'
      ? '**Nightshift risk (shadow mode): Low.** Every changed file is a test, story, eval data or doc file owned only by `@elastic/nightshift`. Once approval is turned on, a PR like this could merge on a bot approval after Libra and CI pass.'
      : '**Nightshift risk (shadow mode): not Low.** This PR needs the usual human review.';
  const list = reasons
    .slice(0, MAX_REASONS)
    .map((r) => `- ${r}`)
    .concat(reasons.length > MAX_REASONS ? [`- and ${reasons.length - MAX_REASONS} more`] : []);
  return [
    head,
    ...(list.length ? ['', ...list] : []),
    '',
    'Shadow mode only labels and comments. It never approves. Nothing changes about how this PR is reviewed.',
    '',
    MARKER,
  ].join('\n');
};

// codeowners: the base branch's CODEOWNERS text; the workflow checks out only `.github`.
module.exports = async ({
  github,
  context,
  core,
  codeowners = fs.readFileSync('.github/CODEOWNERS', 'utf8'),
}) => {
  const pr = context.payload.pull_request;
  const { owner, repo } = context.repo;
  const issue_number = pr.number;

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const result = classify(files, {
    totalFiles: pr.changed_files,
    authorAssociation: pr.author_association,
    ownersOf: parseCodeowners(codeowners),
  });
  core.info(`PR #${pr.number}: ${JSON.stringify(result)}`);

  // This runs on every PR to main, so stop early for the many PRs that never had a Low label.
  const hasLabel = pr.labels.some((l) => l.name === LABEL);
  if (result.scope === 'none' && !hasLabel) return;

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const existing = comments.find((c) => c.body?.includes(MARKER));

  if (result.tier === 'low') {
    if (!hasLabel)
      await github.rest.issues.addLabels({ owner, repo, issue_number, labels: [LABEL] });
  } else if (hasLabel) {
    await github.rest.issues.removeLabel({ owner, repo, issue_number, name: LABEL });
  }

  // Comment on Low PRs only, so not-Low PRs stay quiet. Once a Low comment exists, keep it
  // current so it never claims Low after the PR changes.
  if (result.scope === 'none') {
    if (existing) await github.rest.issues.deleteComment({ owner, repo, comment_id: existing.id });
    return;
  }
  const body = commentBody(result);
  if (existing) {
    if (existing.body !== body) {
      await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    }
  } else if (result.tier === 'low') {
    await github.rest.issues.createComment({ owner, repo, issue_number, body });
  }
};

module.exports.classify = classify;
module.exports.commentBody = commentBody;
module.exports.parseCodeowners = parseCodeowners;
module.exports.LABEL = LABEL;
module.exports.MARKER = MARKER;
