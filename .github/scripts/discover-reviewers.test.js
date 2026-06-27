'use strict';

// @ts-check

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  applyToGlobs,
  discoverReviewers,
  filterDiff,
  parseDiffFiles,
  parseFrontmatter,
} = require('./discover-reviewers');

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'discover-reviewers-'));
const noopLogger = {
  log: () => {},
  warn: () => {},
};

/**
 * @param {string} dir
 * @returns {void}
 */
const mkdirp = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

test('parseFrontmatter reads reviewer metadata and body', () => {
  const parsed = parseFrontmatter(`---
applyTo: "{**/*.ts,**/*.js}"
name: general-reviewer
description: General reviewer
---

# Review
`);

  assert.equal(parsed.applyTo, '{**/*.ts,**/*.js}');
  assert.equal(parsed.name, 'general-reviewer');
  assert.equal(parsed.description, 'General reviewer');
  assert.equal(parsed.body.trim(), '# Review');
});

test('applyToGlobs parses brace-wrapped comma lists', () => {
  assert.deepEqual(applyToGlobs('{**/test/scout*/**, **/kbn-scout*/**}'), [
    '**/test/scout*/**',
    '**/kbn-scout*/**',
  ]);
});

test('filterDiff keeps only matching diff files', () => {
  const diffFiles = parseDiffFiles(`diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a/x-pack/plugins/foo/test/scout/foo.spec.ts b/x-pack/plugins/foo/test/scout/foo.spec.ts
index 3333333..4444444 100644
--- a/x-pack/plugins/foo/test/scout/foo.spec.ts
+++ b/x-pack/plugins/foo/test/scout/foo.spec.ts
@@ -1 +1 @@
-old
+new
`);

  const filtered = filterDiff(diffFiles, ['**/test/scout*/**']);

  assert.match(filtered, /test\/scout\/foo\.spec\.ts/);
  assert.doesNotMatch(filtered, /src\/foo\.ts/);
});

test('discoverReviewers writes Codex TOML agents and precomputed filtered diffs', (t) => {
  const root = makeTempDir();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const instructionsDir = path.join(root, '.github/instructions');
  const codexAgentsDir = path.join(root, '.codex/agents');
  const diffsDir = path.join(root, 'diffs');
  const findingsDir = path.join(root, 'findings');
  const reviewersPath = path.join(root, 'reviewers.json');
  const reviewersCsvPath = path.join(root, 'reviewers.csv');
  const prDiffPath = path.join(root, 'agent/pr-diff.txt');

  mkdirp(instructionsDir);
  mkdirp(path.dirname(prDiffPath));

  fs.writeFileSync(
    path.join(instructionsDir, 'general.instructions.md'),
    `---
applyTo: "**/*"
name: general-reviewer
description: General reviewer
---

# General Review
`
  );

  fs.writeFileSync(
    path.join(instructionsDir, 'scout.instructions.md'),
    `---
applyTo: "{**/test/scout*/**,**/kbn-scout*/**}"
name: scout-reviewer
description: Scout reviewer
---

# Scout Review
`
  );

  fs.writeFileSync(
    prDiffPath,
    `diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1 +1 @@
-old
+new
diff --git a/x-pack/plugins/foo/test/scout/foo.spec.ts b/x-pack/plugins/foo/test/scout/foo.spec.ts
index 3333333..4444444 100644
--- a/x-pack/plugins/foo/test/scout/foo.spec.ts
+++ b/x-pack/plugins/foo/test/scout/foo.spec.ts
@@ -1 +1 @@
-old
+new
`
  );

  const reviewers = discoverReviewers({
    instructionsDir,
    codexAgentsDir,
    diffsDir,
    findingsDir,
    reviewersPath,
    reviewersCsvPath,
    prDiffPath,
    logger: noopLogger,
  });

  assert.deepEqual(
    reviewers.map((reviewer) => reviewer.name),
    ['general-reviewer', 'scout-reviewer']
  );

  const scoutAgent = fs.readFileSync(path.join(codexAgentsDir, 'scout-reviewer.toml'), 'utf8');
  assert.match(scoutAgent, /^name = "scout-reviewer"/m);
  assert.match(scoutAgent, /^developer_instructions = /m);
  assert.doesNotMatch(scoutAgent, /GITHUB_SHA/);
  assert.equal(fs.existsSync(path.join(codexAgentsDir, 'scout-reviewer.md')), false);

  const generalDiff = fs.readFileSync(path.join(diffsDir, 'general-reviewer.diff'), 'utf8');
  const scoutDiff = fs.readFileSync(path.join(diffsDir, 'scout-reviewer.diff'), 'utf8');

  assert.match(generalDiff, /src\/foo\.ts/);
  assert.match(generalDiff, /test\/scout\/foo\.spec\.ts/);
  assert.doesNotMatch(scoutDiff, /src\/foo\.ts/);
  assert.match(scoutDiff, /test\/scout\/foo\.spec\.ts/);

  const reviewersJson = JSON.parse(fs.readFileSync(reviewersPath, 'utf8'));
  assert.deepEqual(reviewersJson, reviewers);
  assert.equal(fs.readFileSync(reviewersCsvPath, 'utf8'), 'general-reviewer,scout-reviewer');
  assert.equal(fs.existsSync(findingsDir), true);
});
