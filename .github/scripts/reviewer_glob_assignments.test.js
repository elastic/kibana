/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  computeAssignments,
  matchFiles,
  parseFrontmatter,
  readReviewers,
  writeReviewerContexts,
} = require('./reviewer_glob_assignments');

const agentsDir = path.resolve(__dirname, '../../.claude/agents');

test('matches explicit and normalized dot-directory paths', () => {
  const files = ['.github/workflows/reviewer.yml', '.buildkite/scripts/review.ts', 'src/review.ts'];

  assert.deepEqual(matchFiles(files, ['.github/**']), ['.github/workflows/reviewer.yml']);
  assert.deepEqual(matchFiles(files, ['**/*.ts']), [
    '.buildkite/scripts/review.ts',
    'src/review.ts',
  ]);
});

test('dispatches source-only changes to omission and domain reviewers', () => {
  const reviewers = readReviewers(agentsDir);
  const assignments = computeAssignments({
    files: [
      'src/platform/plugin/server/service.ts',
      'src/platform/plugin/public/component.tsx',
      '.github/workflows/reviewer.yml',
    ],
    reviewers,
  });

  assert(assignments['pr-reviewer-test'].includes('src/platform/plugin/server/service.ts'));
  assert(assignments['pr-reviewer-docs'].includes('src/platform/plugin/public/component.tsx'));
  assert(assignments['pr-reviewer-ci'].includes('.github/workflows/reviewer.yml'));
  assert.deepEqual(assignments['pr-reviewer-general'], [
    'src/platform/plugin/server/service.ts',
    'src/platform/plugin/public/component.tsx',
    '.github/workflows/reviewer.yml',
  ]);
});

test('rejects malformed frontmatter and duplicate reviewer names', () => {
  assert.throws(() => parseFrontmatter('name: missing-globs'), /Failed parsing reviewer/);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewer-agents-'));
  try {
    const frontmatter = '---\nname: duplicate\nglobs: ["**/*"]\n---\n';
    fs.writeFileSync(path.join(tempDir, 'pr-reviewer-first.md'), frontmatter);
    fs.writeFileSync(path.join(tempDir, 'pr-reviewer-second.md'), frontmatter);

    assert.throws(() => readReviewers(tempDir), /Duplicate reviewer name: duplicate/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('writes compact metadata and reviewer-specific diff slices', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewer-context-'));
  try {
    const fileMetadata = [
      { filename: 'src/a.ts', status: 'modified' },
      { filename: 'src/new.ts', previous_filename: 'src/old.ts', status: 'renamed' },
    ];
    const diffText = [
      'diff --git a/src/a.ts b/src/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/src/old.ts b/src/new.ts',
      '@@ -1 +1 @@',
      '-before',
      '+after',
      '',
    ].join('\n');

    const contexts = writeReviewerContexts({
      fileMetadata,
      diffText,
      assignments: {
        'pr-reviewer-general': ['src/a.ts', 'src/new.ts'],
        'pr-reviewer-test': ['src/a.ts'],
      },
      reviewerDiffDir: tempDir,
    });

    assert.deepEqual(contexts['pr-reviewer-general'].files, [
      { path: 'src/a.ts', status: 'modified' },
      { path: 'src/new.ts', status: 'renamed', previousPath: 'src/old.ts' },
    ]);

    const testDiff = fs.readFileSync(contexts['pr-reviewer-test'].diffPath, 'utf8');
    assert.match(testDiff, /diff --git a\/src\/a\.ts b\/src\/a\.ts/);
    assert.doesNotMatch(testDiff, /src\/new\.ts/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
