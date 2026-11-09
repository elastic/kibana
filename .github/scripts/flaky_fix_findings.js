/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Collects the findings the Flaky Fix Retrospective recorded on its monthly tracking issues,
 * for the Flaky Fix Curator. Each finding comment ends with a fenced `flaky-fix-finding` YAML
 * block with a flat, fixed schema, parsed here without a YAML dependency because this runs in
 * actions/github-script with nothing but Node.
 */

const fs = require('fs');
const path = require('path');

const OWNER = 'elastic';
const REPO = 'kibana';
const RETROSPECTIVE_LABEL = 'flaky-fix-retrospective';
const CURATOR_LABEL = 'flaky-fix-curator';
const DEFAULT_OUTPUT_DIR = '/tmp/flaky-fix-curator';
const DEFAULT_DAYS = 28;
const CURATOR_PR_LOOKBACK_DAYS = 90;
const FINDING_BLOCK = /```yaml flaky-fix-finding\n([\s\S]*?)\n```/;
// The retrospective records findings through gh-aw's add-comment with the workflow token, so
// this is the only author whose finding blocks count. Anyone can comment on a public issue.
const FINDING_AUTHORS = new Set(['github-actions[bot]']);
// The instruction files the curator may edit. A finding recorded before one of them changed is
// stale evidence: a human may already have addressed it.
const INSTRUCTION_PATHS = [
  '.github/workflows/shared/flaky-fix-guidelines.md',
  '.github/workflows/flaky-test-fixer.md',
  '.github/workflows/flaky-fix-verifier.md',
  '.github/workflows/failed-test-investigator.md',
  '.agents/skills/flaky-test-investigator',
  'docs/extend/testing',
];

const parseScalar = (raw) => {
  const value = raw.trim();
  if (value === '' || value === 'null' || value === '~') {
    return null;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }
  if (/^\[.*\]$/.test(value)) {
    const inner = value.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((item) => parseScalar(item));
  }
  if (/^(["']).*\1$/.test(value)) {
    return value.slice(1, -1);
  }
  return value;
};

/** Parses the flat `key: value` lines of a finding block into an object. */
const parseFindingBlock = (block) => {
  const finding = {};
  for (const line of block.split('\n')) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/);
    if (match) {
      finding[match[1]] = parseScalar(match[2]);
    }
  }
  return finding;
};

/** The finding recorded in a tracking-issue comment, or null when the comment is not one. */
const parseFinding = (comment) => {
  const match = (comment.body || '').match(FINDING_BLOCK);
  if (!match) {
    return null;
  }
  const finding = parseFindingBlock(match[1]);
  if (!finding.case || !finding.fix_pr) {
    return null;
  }
  const headline = (comment.body.match(/^###\s+(.+)$/m) || [])[1] ?? '';
  return {
    ...finding,
    headline: headline.trim(),
    comment_url: comment.html_url,
    recorded_at: comment.created_at,
  };
};

const summarize = (findings) => {
  const count = (key) =>
    findings.reduce((acc, finding) => {
      const value = finding[key] ?? 'null';
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});
  return {
    total: findings.length,
    actionable: findings.filter((finding) => finding.lesson_type && finding.lesson_type !== 'none')
      .length,
    byCase: count('case'),
    byDivergence: count('divergence'),
    byLessonType: count('lesson_type'),
    byLessonTarget: count('lesson_target'),
    byGuideline: count('guideline'),
    byFramework: count('framework'),
  };
};

const writeJson = (outputDir, filename, value) => {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`);
};

/**
 * Gathers the findings recorded in the last `days` days, the curator PRs of the last three
 * months (so proposals are not repeated) and the commits that touched the instruction files in
 * the window (so findings a human already addressed are not counted), and writes them for the agent. Sets the `findings`
 * output to the number of actionable findings so the workflow can skip the agent when there
 * is nothing to curate.
 */
const collectFlakyFixFindings = async ({
  github,
  core,
  outputDir = DEFAULT_OUTPUT_DIR,
  days = DEFAULT_DAYS,
  now = new Date(),
}) => {
  const since = new Date(now.getTime() - days * 864e5).toISOString();
  const trackingIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO,
    labels: RETROSPECTIVE_LABEL,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 20,
  });

  const findings = [];
  for (const issue of trackingIssues.filter((candidate) => !candidate.pull_request)) {
    if (new Date(issue.updated_at).getTime() < new Date(since).getTime()) {
      continue;
    }
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner: OWNER,
      repo: REPO,
      issue_number: issue.number,
      since,
      per_page: 100,
    });
    for (const comment of comments) {
      // `since` filters on update time, so an edited old finding would come back; and only the
      // retrospective's own comments are findings.
      if (
        new Date(comment.created_at).getTime() < new Date(since).getTime() ||
        !FINDING_AUTHORS.has(comment.user?.login)
      ) {
        continue;
      }
      const finding = parseFinding(comment);
      if (finding) {
        findings.push({ ...finding, tracking_issue: issue.number });
      }
    }
  }
  findings.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

  const curatorSince = new Date(now.getTime() - CURATOR_PR_LOOKBACK_DAYS * 864e5)
    .toISOString()
    .slice(0, 10);
  const { data: curatorSearch } = await github.rest.search.issuesAndPullRequests({
    q: `repo:${OWNER}/${REPO} is:pr label:${CURATOR_LABEL} created:>=${curatorSince}`,
    per_page: 50,
  });
  const curatorPrs = curatorSearch.items.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.pull_request?.merged_at ? 'merged' : pr.state,
    url: pr.html_url,
    created_at: pr.created_at,
    body: pr.body ?? '',
  }));

  const instructionChanges = [];
  for (const instructionPath of INSTRUCTION_PATHS) {
    const commits = await github.paginate(github.rest.repos.listCommits, {
      owner: OWNER,
      repo: REPO,
      path: instructionPath,
      since,
      per_page: 100,
    });
    for (const commit of commits) {
      instructionChanges.push({
        path: instructionPath,
        sha: commit.sha,
        committed_at: commit.commit?.committer?.date ?? commit.commit?.author?.date ?? null,
        title: (commit.commit?.message ?? '').split('\n')[0],
        url: commit.html_url,
      });
    }
  }
  instructionChanges.sort((a, b) => (a.committed_at ?? '').localeCompare(b.committed_at ?? ''));

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'findings.jsonl'),
    findings.map((finding) => JSON.stringify(finding)).join('\n') + (findings.length ? '\n' : '')
  );
  const summary = { since, days, ...summarize(findings) };
  writeJson(outputDir, 'findings-summary.json', summary);
  writeJson(outputDir, 'curator-prs.json', curatorPrs);
  writeJson(outputDir, 'instruction-changes.json', instructionChanges);

  core.info(
    `Collected ${findings.length} finding(s) since ${since}, ${summary.actionable} actionable; ${curatorPrs.length} curator PR(s) in the last ${CURATOR_PR_LOOKBACK_DAYS} days; ${instructionChanges.length} instruction change(s) in the window.`
  );
  core.setOutput('findings', String(summary.actionable));
  return summary;
};

module.exports = { collectFlakyFixFindings, parseFinding, parseFindingBlock, summarize };
