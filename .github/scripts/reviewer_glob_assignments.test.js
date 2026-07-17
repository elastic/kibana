/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assignReviewers,
  balanceFilesByChangedLines,
  computeAssignments,
  createReviewTasks,
  getDiffSection,
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

test('dispatches source-only changes to domain reviewers', () => {
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

test('balances files by changed lines with deterministic top-and-bottom pairings', () => {
  const chunks = balanceFilesByChangedLines({
    files: [
      { filename: 'src/a.ts', changes: 9 },
      { filename: 'src/b.ts', changes: 8 },
      { filename: 'src/c.ts', changes: 7 },
      { filename: 'src/d.ts', changes: 6 },
      { filename: 'src/e.ts', changes: 5 },
      { filename: 'src/f.ts', changes: 4 },
    ],
    chunkCount: 3,
  });

  assert.deepEqual(
    chunks.map((chunk) => ({
      files: chunk.files.map((file) => file.filename),
      changedLines: chunk.changedLines,
    })),
    [
      { files: ['src/a.ts', 'src/f.ts'], changedLines: 13 },
      { files: ['src/b.ts', 'src/e.ts'], changedLines: 13 },
      { files: ['src/c.ts', 'src/d.ts'], changedLines: 13 },
    ]
  );
});

test('creates ten general review tasks without duplicating files', () => {
  const fileMetadata = Array.from({ length: 20 }, (_, index) => ({
    filename: `src/file_${String(index + 1).padStart(2, '0')}.ts`,
    changes: 20 - index,
  }));
  const tasks = createReviewTasks({
    fileMetadata,
    assignments: {
      'pr-reviewer-general': fileMetadata.map((file) => file.filename),
    },
  });
  const taskEntries = Object.entries(tasks);

  assert.equal(taskEntries.length, 10);
  assert(taskEntries.every(([, task]) => task.subagentType === 'pr-reviewer-general'));
  assert.deepEqual(
    taskEntries.flatMap(([, task]) => task.files.map((file) => file.filename)).sort(),
    fileMetadata.map((file) => file.filename).sort()
  );
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
      { filename: 'src/a.ts', status: 'modified', changes: 10 },
      {
        filename: 'src/new.ts',
        previous_filename: 'src/old.ts',
        status: 'renamed',
        changes: 2,
      },
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
      generalChunkCount: 2,
    });

    assert.deepEqual(contexts['pr-reviewer-general-chunk-01'].files, [
      { path: 'src/a.ts', status: 'modified' },
    ]);
    assert.deepEqual(contexts['pr-reviewer-general-chunk-02'].files, [
      { path: 'src/new.ts', status: 'renamed', previousPath: 'src/old.ts' },
    ]);

    const testDiff = fs.readFileSync(contexts['pr-reviewer-test'].diffPath, 'utf8');
    assert.match(testDiff, /diff --git a\/src\/a\.ts b\/src\/a\.ts/);
    assert.doesNotMatch(testDiff, /src\/new\.ts/);

    const renamedDiff = fs.readFileSync(contexts['pr-reviewer-general-chunk-02'].diffPath, 'utf8');
    assert.match(renamedDiff, /diff --git a\/src\/old\.ts b\/src\/new\.ts/);
    assert.match(renamedDiff, /\+after/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('returns a placeholder when an assigned diff section is missing', () => {
  assert.equal(
    getDiffSection({ diffText: '', file: { filename: 'src/missing.ts' } }),
    [
      'diff --git a/src/missing.ts b/src/missing.ts',
      '# Diff section was not found in the prefetched PR context.',
      '',
    ].join('\n')
  );
});

test('assignReviewers fails when prefetched artifacts are missing', async () => {
  const failures = [];

  await assignReviewers({
    core: {
      setFailed: (message) => failures.push(message),
    },
    prFilesPath: '/missing/pr-files.json',
    prDiffPath: '/missing/pr-diff.txt',
  });

  assert.deepEqual(failures, [
    'Prefetched PR files or diff not found at /missing/pr-files.json and /missing/pr-diff.txt',
  ]);
});

test('assignReviewers fails when no reviewer definitions are available', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewer-empty-'));
  try {
    const agentsDir = path.join(tempDir, 'agents');
    const prFilesPath = path.join(tempDir, 'pr-files.json');
    const prDiffPath = path.join(tempDir, 'pr-diff.txt');
    const failures = [];
    fs.writeFileSync(prFilesPath, '[]\n');
    fs.writeFileSync(prDiffPath, '');

    await assignReviewers({
      core: {
        setFailed: (message) => failures.push(message),
      },
      agentsDir,
      prFilesPath,
      prDiffPath,
    });

    assert.deepEqual(failures, [`No pr-reviewer-*.md subagents with globs found in ${agentsDir}`]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('assignReviewers ignores PR file entries without a filename', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reviewer-assign-'));
  try {
    const agentsDir = path.join(tempDir, 'agents');
    const prFilesPath = path.join(tempDir, 'pr-files.json');
    const prDiffPath = path.join(tempDir, 'pr-diff.txt');
    const outputPath = path.join(tempDir, 'assignments.json');
    const reviewerDiffDir = path.join(tempDir, 'reviewer-diffs');
    fs.mkdirSync(agentsDir);
    fs.writeFileSync(
      path.join(agentsDir, 'pr-reviewer-general.md'),
      '---\nname: pr-reviewer-general\nglobs: ["**/*"]\n---\n'
    );
    fs.writeFileSync(
      prFilesPath,
      `${JSON.stringify([{}, { filename: 'src/a.ts', status: 'modified' }])}\n`
    );
    fs.writeFileSync(
      prDiffPath,
      ['diff --git a/src/a.ts b/src/a.ts', '@@ -1 +1 @@', '-old', '+new', ''].join('\n')
    );

    await assignReviewers({
      core: {
        info: () => {},
      },
      agentsDir,
      prFilesPath,
      prDiffPath,
      outputPath,
      reviewerDiffDir,
      generalChunkCount: 1,
    });

    const assignments = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.deepEqual(assignments['pr-reviewer-general-chunk-01'].files, [
      { path: 'src/a.ts', status: 'modified' },
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
