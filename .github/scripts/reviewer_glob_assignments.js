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
const GENERAL_REVIEWER = 'pr-reviewer-general';
const GENERAL_REVIEWER_CHUNK_COUNT = 2;

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

const getFileChangedLines = (file) => {
  if (Number.isFinite(file.changes)) {
    return file.changes;
  }

  const additions = Number.isFinite(file.additions) ? file.additions : 0;
  const deletions = Number.isFinite(file.deletions) ? file.deletions : 0;
  return additions + deletions;
};

const balanceFilesByChangedLines = ({ files, chunkCount = GENERAL_REVIEWER_CHUNK_COUNT }) => {
  if (!Number.isInteger(chunkCount) || chunkCount < 1) {
    throw new Error(`chunkCount must be a positive integer, received: ${chunkCount}`);
  }

  const chunks = Array.from({ length: chunkCount }, (_, index) => ({
    index: index + 1,
    files: [],
    changedLines: 0,
  }));
  const filesByDescendingSize = [...files].sort(
    (left, right) =>
      getFileChangedLines(right) - getFileChangedLines(left) ||
      left.filename.localeCompare(right.filename)
  );

  for (const file of filesByDescendingSize) {
    let lightestChunk = chunks[0];
    for (const chunk of chunks.slice(1)) {
      if (chunk.changedLines < lightestChunk.changedLines) {
        lightestChunk = chunk;
      }
    }

    lightestChunk.files.push(file);
    lightestChunk.changedLines += getFileChangedLines(file);
  }

  return chunks.filter((chunk) => chunk.files.length > 0);
};

const createReviewTasks = ({
  fileMetadata,
  assignments,
  generalChunkCount = GENERAL_REVIEWER_CHUNK_COUNT,
}) => {
  const filesByPath = new Map(fileMetadata.map((file) => [file.filename, file]));
  const tasks = {};

  for (const [reviewer, matchedPaths] of Object.entries(assignments)) {
    const matchedFiles = matchedPaths
      .map((matchedPath) => filesByPath.get(matchedPath))
      .filter(Boolean);

    if (reviewer === GENERAL_REVIEWER) {
      const chunks = balanceFilesByChangedLines({
        files: matchedFiles,
        chunkCount: generalChunkCount,
      });
      for (const chunk of chunks) {
        const chunkNumber = String(chunk.index).padStart(2, '0');
        tasks[`${reviewer}-chunk-${chunkNumber}`] = {
          subagentType: reviewer,
          files: chunk.files,
          changedLines: chunk.changedLines,
        };
      }
      continue;
    }

    if (matchedFiles.length > 0) {
      tasks[reviewer] = {
        subagentType: reviewer,
        files: matchedFiles,
        changedLines: matchedFiles.reduce((total, file) => total + getFileChangedLines(file), 0),
      };
    }
  }

  return tasks;
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

const writeReviewerContexts = ({
  fileMetadata,
  diffText,
  assignments,
  reviewerDiffDir,
  generalChunkCount = GENERAL_REVIEWER_CHUNK_COUNT,
}) => {
  fs.mkdirSync(reviewerDiffDir, { recursive: true });

  const tasks = createReviewTasks({ fileMetadata, assignments, generalChunkCount });
  const contexts = {};

  for (const [taskId, task] of Object.entries(tasks)) {
    const diffPath = path.join(reviewerDiffDir, `${taskId}.diff`);
    const reviewerDiff = task.files.map((file) => getDiffSection({ diffText, file })).join('');

    fs.writeFileSync(diffPath, reviewerDiff);
    contexts[taskId] = {
      subagentType: task.subagentType,
      files: task.files.map(compactFileMetadata),
      changedLines: task.changedLines,
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
  generalChunkCount = GENERAL_REVIEWER_CHUNK_COUNT,
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
    generalChunkCount,
  });

  fs.writeFileSync(outputPath, `${JSON.stringify(reviewerContexts, null, 2)}\n`);

  const summary = Object.entries(reviewerContexts)
    .map(
      ([taskId, context]) =>
        `${taskId}=${context.files.length} files/${context.changedLines} changed lines`
    )
    .join(', ');
  log.info(`Reviewer task assignments (${files.length} changed files): ${summary}`);
};

module.exports = {
  parseFrontmatter,
  matchFiles,
  readReviewers,
  computeAssignments,
  getFileChangedLines,
  balanceFilesByChangedLines,
  createReviewTasks,
  getDiffSection,
  compactFileMetadata,
  writeReviewerContexts,
  assignReviewers,
};
