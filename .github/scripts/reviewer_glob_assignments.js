/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_AGENTS_DIR = '.claude/agents';
const DEFAULT_PR_FILES_PATH = '/tmp/gh-aw/agent/pr-files.json';
const DEFAULT_PR_DIFF_PATH = '/tmp/gh-aw/agent/pr-diff.txt';
const DEFAULT_OUTPUT_PATH = '/tmp/gh-aw/agent/pr-reviewer-assignments.json';
const DEFAULT_REVIEWER_DIFF_DIR = '/tmp/gh-aw/agent/reviewer-diffs';
const REVIEWER_FILENAME = /^pr-reviewer-.*\.md$/;

// `**/*` and `**` mean "every file" — path.matchesGlob otherwise skips dot-directories.
const CATCH_ALL_GLOBS = new Set(['**/*', '**']);

const parseFrontmatter = (text) => {
  try {
    return {
      name: text.match(/^name:\s*(\S+)/m)[1],
      globs: JSON.parse(text.match(/^globs:\s*(\[[\s\S]*?\])/m)[1]),
    };
  } catch {
    throw new Error(`Failed parsing reviewer frontmatter:\n${text}`);
  }
};

const matchFiles = (files, globs) => {
  if (globs.some((glob) => CATCH_ALL_GLOBS.has(glob))) {
    return [...files];
  }

  return files.filter((file) => {
    const undotted = file.replace(/(^|\/)\./g, '$1');
    return globs.some((glob) => path.matchesGlob(file, glob) || path.matchesGlob(undotted, glob));
  });
};

const readReviewers = (agentsDir) => {
  const entries = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir) : [];

  const reviewers = entries
    .filter((entry) => REVIEWER_FILENAME.test(entry))
    .sort()
    .map((entry) => parseFrontmatter(fs.readFileSync(path.join(agentsDir, entry), 'utf8')))
    .filter((reviewer) => reviewer.name && reviewer.globs.length > 0);

  const names = new Set();
  for (const reviewer of reviewers) {
    if (names.has(reviewer.name)) {
      throw new Error(`Duplicate reviewer name: ${reviewer.name}`);
    }
    names.add(reviewer.name);
  }

  return reviewers;
};

const computeAssignments = ({ files, reviewers }) => {
  const assignments = {};
  for (const reviewer of reviewers) {
    assignments[reviewer.name] = matchFiles(files, reviewer.globs);
  }
  return assignments;
};

const getDiffSection = ({ diffText, file }) => {
  const previousFilename = file.previous_filename ?? file.filename;
  const header = `diff --git a/${previousFilename} b/${file.filename}`;
  const start = diffText.indexOf(header);
  if (start === -1) {
    return `${header}\n# Diff section was not found in the prefetched PR context.\n`;
  }

  const next = diffText.indexOf('\ndiff --git a/', start + header.length);
  return diffText.slice(start, next === -1 ? undefined : next).trimEnd() + '\n';
};

const compactFileMetadata = (file) => ({
  path: file.filename,
  status: file.status,
  ...(file.previous_filename ? { previousPath: file.previous_filename } : {}),
});

const writeReviewerContexts = ({ fileMetadata, diffText, assignments, reviewerDiffDir }) => {
  fs.mkdirSync(reviewerDiffDir, { recursive: true });

  const filesByPath = new Map(fileMetadata.map((file) => [file.filename, file]));
  const contexts = {};

  for (const [reviewer, matchedPaths] of Object.entries(assignments)) {
    const matchedFiles = matchedPaths
      .map((matchedPath) => filesByPath.get(matchedPath))
      .filter(Boolean);
    const diffPath = path.join(reviewerDiffDir, `${reviewer}.diff`);
    const reviewerDiff = matchedFiles.map((file) => getDiffSection({ diffText, file })).join('');

    fs.writeFileSync(diffPath, reviewerDiff);
    contexts[reviewer] = {
      files: matchedFiles.map(compactFileMetadata),
      diffPath,
    };
  }

  return contexts;
};

const assignReviewers = async ({
  core,
  agentsDir = DEFAULT_AGENTS_DIR,
  prFilesPath = DEFAULT_PR_FILES_PATH,
  prDiffPath = DEFAULT_PR_DIFF_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  reviewerDiffDir = DEFAULT_REVIEWER_DIFF_DIR,
} = {}) => {
  const log = core ?? console;

  if (!fs.existsSync(prFilesPath) || !fs.existsSync(prDiffPath)) {
    const message = `Prefetched PR files or diff not found at ${prFilesPath} and ${prDiffPath}`;
    core ? core.setFailed(message) : log.error(message);
    return;
  }

  const fileMetadata = JSON.parse(fs.readFileSync(prFilesPath, 'utf8')).filter(
    (file) => file.filename
  );
  const files = fileMetadata.map((file) => file.filename);
  const diffText = fs.readFileSync(prDiffPath, 'utf8');

  const reviewers = readReviewers(agentsDir);
  if (reviewers.length === 0) {
    const message = `No pr-reviewer-*.md subagents with globs found in ${agentsDir}`;
    core ? core.setFailed(message) : log.error(message);
    return;
  }

  const assignments = computeAssignments({ files, reviewers });
  const reviewerContexts = writeReviewerContexts({
    fileMetadata,
    diffText,
    assignments,
    reviewerDiffDir,
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(reviewerContexts, null, 2)}\n`);

  const summary = Object.entries(assignments)
    .map(([name, matched]) => `${name}=${matched.length}`)
    .join(', ');
  log.info(`Reviewer file assignments (${files.length} changed files): ${summary}`);
};

module.exports = {
  parseFrontmatter,
  matchFiles,
  readReviewers,
  computeAssignments,
  getDiffSection,
  compactFileMetadata,
  writeReviewerContexts,
  assignReviewers,
};
