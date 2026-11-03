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

const { parseFinding, parseFindingBlock, summarize } = require('./flaky_fix_findings');

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
