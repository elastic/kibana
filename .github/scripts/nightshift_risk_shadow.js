/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shadow mode for low-risk auto-approval of Nightshift PRs. It labels and comments only;
// nothing here approves a PR. A PR is Low only when every changed file is in a Nightshift
// path AND matches a Low pattern below. Anything unknown counts as not Low.

const MARKER = '<!-- nightshift-risk-shadow -->';
const LABEL = 'nightshift:risk-low';

const NIGHTSHIFT_PATHS = [
  'x-pack/solutions/observability/plugins/nightshift/',
  'x-pack/solutions/observability/plugins/nightshift_sources/',
  'x-pack/solutions/observability/plugins/nightshift_investigations/',
  'x-pack/solutions/observability/plugins/significant_events/',
  'x-pack/solutions/observability/packages/kbn-nightshift-shared/',
  'x-pack/solutions/observability/packages/kbn-nightshift-decision-trees/',
  'x-pack/solutions/observability/packages/kbn-investigation-output/',
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-',
  'x-pack/solutions/observability/packages/kbn-evals-suite-significant-events/',
  'x-pack/platform/plugins/shared/sandbox/',
  'x-pack/platform/packages/shared/kbn-nightshift-ai/',
  'x-pack/platform/packages/shared/kbn-significant-events-schema/',
  // Code Nightshift owns alone outside its plugins and packages (per CODEOWNERS). Co-owned
  // code such as agentic_investigations is left out: its other owners review it anyway.
  'x-pack/platform/plugins/shared/actions/server/lib/relay/',
  'src/platform/packages/shared/kbn-workflows/managed/definitions/significant_events/',
  'src/platform/packages/shared/kbn-workflows/managed/definitions/nightshift_investigations/',
  'x-pack/solutions/observability/plugins/observability/test/scout_nightshift_investigations/',
  'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/significant_events/',
  'packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-automation/',
  'packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-source/',
  'packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/relay-app-connection/',
  'packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/significant-events-maintenance-state/',
  'x-pack/solutions/observability/packages/kbn-evals-suite-observability-ai/',
];

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
  // Dev-only eval suites.
  /^x-pack\/solutions\/observability\/packages\/kbn-evals-suite-(nightshift-[^/]+|significant-events|observability-ai)\//,
  // Docs only. Instruction files for coding agents are not Low.
  /^(?!.*\/(AGENTS|CLAUDE|SKILL)\.md$).*\.md$/,
];

// Added lines that turn a test off or narrow a run. Covers Jest and Playwright/Scout
// spellings such as `it.skip(`, `test.describe.only(` and `apiTest.fixme(`.
const DISABLED_TEST =
  /^\+.*\b(?:(?:it|describe|\w*[tT]est)(?:\.\w+)*\.(?:skip|only|todo|fixme)|xit|xdescribe|xtest|fit|fdescribe)\s*\(/m;

const isNightshift = (path) => NIGHTSHIFT_PATHS.some((prefix) => path.startsWith(prefix));
const isTest = (path) => TEST_PATTERNS.some((re) => re.test(path));
const isLowPath = (path) => LOW_PATTERNS.some((re) => re.test(path));

// files: the shape returned by pulls.listFiles. totalFiles: the PR's changed_files count.
const classify = (files, { totalFiles = files.length, authorAssociation } = {}) => {
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
      reasons.push(`\`${f.filename}\` is outside Nightshift paths`);
    } else if (!paths.every(isLowPath)) {
      reasons.push(`\`${f.filename}\` is not a test, story, eval or doc file`);
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
      ? '**Nightshift risk (shadow mode): Low.** Every changed file is a test, story, eval or doc file in a Nightshift path. Once approval is turned on, a PR like this could merge on a bot approval after Libra and CI pass.'
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

module.exports = async ({ github, context, core }) => {
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
  });
  core.info(`PR #${pr.number}: ${JSON.stringify(result)}`);

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const existing = comments.find((c) => c.body?.includes(MARKER));
  const hasLabel = pr.labels.some((l) => l.name === LABEL);

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
module.exports.LABEL = LABEL;
module.exports.MARKER = MARKER;
