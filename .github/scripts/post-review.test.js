'use strict';

// @ts-check

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  addFindingReviewerMarker,
  collectReviewFindings,
  dedupeFindings,
  filterExistingFindings,
  isReviewFromWorkflow,
  readFindingReviewerMarker,
  readExistingCommentKeys,
  readExistingCommentState,
  readFindingJsonl,
  readWorkflowReviewIds,
} = require('./post-review');

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'post-review-'));

test('readFindingJsonl ignores malformed lines and reads valid findings', (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const findingsDir = path.join(root, 'findings');
  fs.mkdirSync(findingsDir, { recursive: true });
  fs.writeFileSync(
    path.join(findingsDir, 'general-reviewer.jsonl'),
    [
      JSON.stringify({ path: 'src/a.ts', line: 1, body: 'first' }),
      '{not-json',
      JSON.stringify({ path: 'src/b.ts', line: 2, body: 'second' }),
      '',
    ].join('\n')
  );

  assert.deepEqual(readFindingJsonl(findingsDir), [
    { path: 'src/a.ts', line: 1, body: 'first' },
    { path: 'src/b.ts', line: 2, body: 'second' },
  ]);
});

test('dedupeFindings keeps distinct reviewers for the same path and line', () => {
  const findings = dedupeFindings([
    { reviewer: 'general-reviewer', path: 'src/a.ts', line: 1, body: 'short' },
    {
      reviewer: 'general-reviewer',
      path: 'src/a.ts',
      line: 1,
      body: 'longer explanation',
    },
    { reviewer: 'scout-reviewer', path: 'src/a.ts', line: 1, body: 'scout issue' },
    { reviewer: 'general-reviewer', path: 'src/b.ts', line: 2, body: 'other' },
  ]);

  assert.deepEqual(findings, [
    {
      reviewer: 'general-reviewer',
      path: 'src/a.ts',
      line: 1,
      body: 'longer explanation',
    },
    { reviewer: 'scout-reviewer', path: 'src/a.ts', line: 1, body: 'scout issue' },
    { reviewer: 'general-reviewer', path: 'src/b.ts', line: 2, body: 'other' },
  ]);
});

test('isReviewFromWorkflow matches the gh-aw workflow footer marker', () => {
  assert.equal(
    isReviewFromWorkflow(
      '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-codex, run_id: 123 -->',
      'reviewer-codex'
    ),
    true
  );
  assert.equal(
    isReviewFromWorkflow(
      '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-claude, run_id: 123 -->',
      'reviewer-codex'
    ),
    false
  );
  assert.equal(isReviewFromWorkflow('plain review body', 'reviewer-codex'), false);
});

test('addFindingReviewerMarker appends and reads hidden reviewer metadata', () => {
  const finding = addFindingReviewerMarker({
    reviewer: 'general-reviewer',
    path: 'src/a.ts',
    line: 1,
    body: 'finding body',
  });

  assert.equal(
    finding.body,
    'finding body\n\n<!-- gh-aw-reviewer-finding: reviewer=general-reviewer -->'
  );
  assert.equal(readFindingReviewerMarker(finding.body), 'general-reviewer');
});

test('readWorkflowReviewIds returns reviews from this workflow', (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const agentDir = path.join(root, 'agent');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentDir, 'pr-reviews.json'),
    JSON.stringify([
      {
        id: 101,
        node_id: 'review-node-101',
        body: '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-codex -->',
      },
      {
        id: 202,
        node_id: 'review-node-202',
        body: '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-claude -->',
      },
    ])
  );

  assert.deepEqual([...readWorkflowReviewIds(agentDir, 'reviewer-codex')], [
    '101',
    'review-node-101',
  ]);
});

test('readExistingCommentState tracks only active and resolved comments from this workflow', (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const agentDir = path.join(root, 'agent');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentDir, 'pr-reviews.json'),
    JSON.stringify([
      {
        id: 101,
        node_id: 'review-node-101',
        body: '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-codex -->',
      },
      {
        id: 202,
        node_id: 'review-node-202',
        body: '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-claude -->',
      },
    ])
  );
  fs.writeFileSync(
    path.join(agentDir, 'pr-review-comments.json'),
    JSON.stringify([
      {
        path: 'src/active.ts',
        line: 1,
        review_id: 101,
        body: 'active body\n\n<!-- gh-aw-reviewer-finding: reviewer=general-reviewer -->',
        review_thread_is_resolved: false,
      },
      {
        path: 'src/resolved.ts',
        line: 2,
        review_node_id: 'review-node-101',
        body: 'resolved body\n\n<!-- gh-aw-reviewer-finding: reviewer=scout-reviewer -->',
        review_thread_is_resolved: true,
      },
      {
        path: 'src/outdated.ts',
        line: 3,
        review_id: 101,
        body: 'outdated body\n\n<!-- gh-aw-reviewer-finding: reviewer=general-reviewer -->',
        review_thread_is_resolved: false,
        review_thread_is_outdated: true,
      },
      {
        path: 'src/other-workflow.ts',
        line: 4,
        review_id: 202,
        review_thread_is_resolved: false,
      },
      {
        path: 'src/human.ts',
        line: 5,
      },
      {
        path: 'src/legacy.ts',
        line: 6,
        review_id: 101,
        body: 'legacy duplicate',
        review_thread_is_resolved: false,
      },
    ])
  );

  const existingState = readExistingCommentState(agentDir, 'reviewer-codex');

  assert.deepEqual([...existingState.activeKeys], ['general-reviewer:src/active.ts:1']);
  assert.deepEqual([...existingState.resolvedKeys], ['scout-reviewer:src/resolved.ts:2']);
  assert.deepEqual([...existingState.activeBodyKeys], ['src/legacy.ts:6:legacy duplicate']);
  assert.deepEqual([...readExistingCommentKeys(agentDir, 'reviewer-codex')], [
    'general-reviewer:src/active.ts:1',
  ]);
});

test('filterExistingFindings skips active reviewer duplicates and marks resolved repeats', () => {
  const findings = filterExistingFindings(
    [
      {
        reviewer: 'general-reviewer',
        path: 'src/shared.ts',
        line: 1,
        body: 'active duplicate',
      },
      {
        reviewer: 'scout-reviewer',
        path: 'src/shared.ts',
        line: 1,
        body: 'different reviewer',
      },
      {
        reviewer: 'scout-reviewer',
        path: 'src/resolved.ts',
        line: 2,
        body: 'still broken',
      },
      {
        reviewer: 'general-reviewer',
        path: 'src/legacy.ts',
        line: 3,
        body: 'legacy duplicate',
      },
      { reviewer: 'general-reviewer', path: 'src/new.ts', line: 4, body: 'new issue' },
    ],
    {
      activeKeys: new Set(['general-reviewer:src/shared.ts:1']),
      resolvedKeys: new Set(['scout-reviewer:src/resolved.ts:2']),
      activeBodyKeys: new Set(['src/legacy.ts:3:legacy duplicate']),
      resolvedBodyKeys: new Set(),
    }
  );

  assert.deepEqual(findings, [
    {
      reviewer: 'scout-reviewer',
      path: 'src/shared.ts',
      line: 1,
      body: 'different reviewer',
    },
    {
      reviewer: 'scout-reviewer',
      path: 'src/resolved.ts',
      line: 2,
      body:
        'This was previously marked resolved, but the issue still appears to be present.\n\nstill broken',
    },
    { reviewer: 'general-reviewer', path: 'src/new.ts', line: 4, body: 'new issue' },
  ]);
});

test('collectReviewFindings dedupes and skips active comments from this workflow only', (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const findingsDir = path.join(root, 'findings');
  const agentDir = path.join(root, 'agent');
  fs.mkdirSync(findingsDir, { recursive: true });
  fs.mkdirSync(agentDir, { recursive: true });

  fs.writeFileSync(
    path.join(findingsDir, 'general-reviewer.jsonl'),
    [
      JSON.stringify({
        reviewer: 'general-reviewer',
        path: 'src/a.ts',
        line: 1,
        body: 'short',
      }),
      JSON.stringify({
        reviewer: 'general-reviewer',
        path: 'src/a.ts',
        line: 1,
        body: 'longer body',
      }),
      JSON.stringify({
        reviewer: 'scout-reviewer',
        path: 'src/a.ts',
        line: 1,
        body: 'scout issue',
      }),
      JSON.stringify({
        reviewer: 'general-reviewer',
        path: 'src/b.ts',
        line: 2,
        body: 'new issue',
      }),
    ].join('\n')
  );

  fs.writeFileSync(
    path.join(agentDir, 'pr-reviews.json'),
    JSON.stringify([
      {
        id: 101,
        body: '<!-- gh-aw-agentic-workflow: workflow_id: reviewer-codex -->',
      },
    ])
  );
  fs.writeFileSync(
    path.join(agentDir, 'pr-review-comments.json'),
    JSON.stringify([
      {
        path: 'src/a.ts',
        line: 1,
        review_id: 101,
        body: 'longer body\n\n<!-- gh-aw-reviewer-finding: reviewer=general-reviewer -->',
        review_thread_is_resolved: false,
      },
    ])
  );

  assert.deepEqual(collectReviewFindings({ findingsDir, agentDir }), [
    {
      reviewer: 'scout-reviewer',
      path: 'src/a.ts',
      line: 1,
      body: 'scout issue\n\n<!-- gh-aw-reviewer-finding: reviewer=scout-reviewer -->',
    },
    {
      reviewer: 'general-reviewer',
      path: 'src/b.ts',
      line: 2,
      body: 'new issue\n\n<!-- gh-aw-reviewer-finding: reviewer=general-reviewer -->',
    },
  ]);
});
