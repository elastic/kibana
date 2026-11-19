/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// These scripts run via actions/github-script outside the Jest project, so
// they use Node's built-in runner:
//   node --test .github/scripts/flaky_fix_findings.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  collectFlakyFixFindings,
  parseFinding,
  parseFindingBlock,
  summarize,
} = require('./flaky_fix_findings');

const body = [
  '### 🔧 revised-before-merge: wait on the signal the assertion reads',
  '',
  'https://github.com/elastic/kibana/pull/300495 · scout · add wait/retry → production code fix · divergence: approach',
  '',
  '<details>',
  '<summary>What happened</summary>',
  '',
  '- **Fixer proposed:** a wait',
  '',
  '</details>',
  '',
  '```yaml flaky-fix-finding',
  'case: revised-before-merge',
  'fix_pr: 300495',
  'issues: [295237, 42]',
  'replacement_pr: null',
  'framework: scout',
  'fixer_approach: add wait/retry',
  'final_approach: production code fix',
  'divergence: approach',
  'guideline: "A test-side wait can\'t fix a production-side race."',
  'guideline_followed: no',
  'lesson_type: reinforce',
  'lesson: Check the product code the assertion exercises before adding a wait.',
  'lesson_target: fixer',
  'confidence: high',
  '```',
].join('\n');

test('parseFindingBlock reads scalars, lists, quoted strings and nulls', () => {
  assert.deepEqual(
    parseFindingBlock(
      'fix_pr: 1\nissues: [2, 3]\nreplacement_pr: null\nguideline: "quoted: text"\nok: true\nlesson: plain text'
    ),
    {
      fix_pr: 1,
      issues: [2, 3],
      replacement_pr: null,
      guideline: 'quoted: text',
      ok: true,
      lesson: 'plain text',
    }
  );
});

test('parseFinding extracts the block, the headline and the comment metadata', () => {
  const finding = parseFinding({
    body,
    html_url: 'https://github.com/elastic/kibana/issues/1#issuecomment-5',
    created_at: '2026-11-03T10:00:00Z',
  });
  assert.equal(finding.case, 'revised-before-merge');
  assert.equal(finding.fix_pr, 300495);
  assert.deepEqual(finding.issues, [295237, 42]);
  assert.equal(finding.replacement_pr, null);
  assert.equal(finding.guideline, "A test-side wait can't fix a production-side race.");
  assert.equal(finding.lesson_type, 'reinforce');
  assert.equal(finding.headline, '🔧 revised-before-merge: wait on the signal the assertion reads');
  assert.equal(finding.comment_url, 'https://github.com/elastic/kibana/issues/1#issuecomment-5');
});

test('parseFinding ignores comments without a complete block', () => {
  assert.equal(parseFinding({ body: 'just a comment' }), null);
  assert.equal(parseFinding({ body: '```yaml flaky-fix-finding\ncase: closed\n```' }), null);
});

test('summarize counts findings by case and actionable lessons', () => {
  const summary = summarize([
    { case: 'closed', lesson_type: 'none', divergence: 'none' },
    { case: 'did-not-hold', lesson_type: 'new', divergence: 'diagnosis', guideline: 'none' },
    { case: 'did-not-hold', lesson_type: 'reinforce', divergence: 'approach', guideline: 'x' },
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.actionable, 2);
  assert.deepEqual(summary.byCase, { closed: 1, 'did-not-hold': 2 });
  assert.deepEqual(summary.byGuideline, { null: 1, none: 1, x: 1 });
});

test('collectFlakyFixFindings keeps only findings the retrospective recorded in the window', async () => {
  const now = new Date('2026-11-03T12:00:00Z');
  const comment = ({ id, login, createdAt }) => ({
    id,
    user: { login },
    created_at: createdAt,
    updated_at: '2026-11-03T11:00:00Z',
    html_url: `https://github.com/elastic/kibana/issues/1#issuecomment-${id}`,
    body,
  });
  const github = {
    paginate: async (method, parameters) => method(parameters),
    rest: {
      issues: {
        listForRepo: async () => [{ number: 1, updated_at: '2026-11-03T11:00:00Z' }],
        listComments: async () => [
          comment({ id: 1, login: 'github-actions[bot]', createdAt: '2026-11-01T10:00:00Z' }),
          // Edited recently, but recorded before the window.
          comment({ id: 2, login: 'github-actions[bot]', createdAt: '2026-10-01T10:00:00Z' }),
          // A finding block posted by someone else is not a finding.
          comment({ id: 3, login: 'someone', createdAt: '2026-11-02T10:00:00Z' }),
        ],
      },
      search: { issuesAndPullRequests: async () => ({ data: { items: [] } }) },
      repos: {
        listCommits: async ({ path: instructionPath }) =>
          instructionPath === '.github/workflows/flaky-test-fixer.md'
            ? [
                {
                  sha: 'abc123',
                  html_url: 'https://github.com/elastic/kibana/commit/abc123',
                  commit: {
                    message: '[Flaky Test Fixer] Wait on the assertion signal\n\nbody',
                    committer: { date: '2026-11-02T09:00:00Z' },
                  },
                },
              ]
            : [],
      },
    },
  };
  const outputs = {};
  const core = { info: () => {}, setOutput: (key, value) => (outputs[key] = value) };
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flaky-fix-curator-'));

  const summary = await collectFlakyFixFindings({ github, core, outputDir, days: 7, now });

  assert.equal(summary.total, 1);
  assert.equal(outputs.findings, '1');
  const lines = fs.readFileSync(path.join(outputDir, 'findings.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  assert.equal(
    JSON.parse(lines[0]).comment_url,
    'https://github.com/elastic/kibana/issues/1#issuecomment-1'
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(outputDir, 'instruction-changes.json'), 'utf8')),
    [
      {
        path: '.github/workflows/flaky-test-fixer.md',
        sha: 'abc123',
        committed_at: '2026-11-02T09:00:00Z',
        title: '[Flaky Test Fixer] Wait on the assertion signal',
        url: 'https://github.com/elastic/kibana/commit/abc123',
      },
    ]
  );
});
