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
const DEFAULT_OUTPUT_PATH = '/tmp/gh-aw/agent/pr-reviewer-assignments.json';
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

  // path.matchesGlob skips dot-directories, so match against the path with leading segment dots stripped.
  return files.filter((file) => {
    const undotted = file.replace(/(^|\/)\./g, '$1');
    return globs.some((glob) => path.matchesGlob(undotted, glob));
  });
};

const readReviewers = (agentsDir) => {
  const entries = fs.existsSync(agentsDir) ? fs.readdirSync(agentsDir) : [];

  return entries
    .filter((entry) => REVIEWER_FILENAME.test(entry))
    .sort()
    .map((entry) => parseFrontmatter(fs.readFileSync(path.join(agentsDir, entry), 'utf8')))
    .filter((reviewer) => reviewer.name && reviewer.globs.length > 0);
};

const computeAssignments = ({ files, reviewers }) => {
  const assignments = {};
  for (const reviewer of reviewers) {
    assignments[reviewer.name] = matchFiles(files, reviewer.globs);
  }
  return assignments;
};

const assignReviewers = async ({
  core,
  agentsDir = DEFAULT_AGENTS_DIR,
  prFilesPath = DEFAULT_PR_FILES_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) => {
  const log = core ?? console;

  if (!fs.existsSync(prFilesPath)) {
    const message = `Prefetched changed-files list not found at ${prFilesPath}`;
    core ? core.setFailed(message) : log.error(message);
    return;
  }

  const files = JSON.parse(fs.readFileSync(prFilesPath, 'utf8'))
    .map((file) => file.filename)
    .filter(Boolean);

  const reviewers = readReviewers(agentsDir);
  if (reviewers.length === 0) {
    const message = `No pr-reviewer-*.md subagents with globs found in ${agentsDir}`;
    core ? core.setFailed(message) : log.error(message);
    return;
  }

  const assignments = computeAssignments({ files, reviewers });

  fs.writeFileSync(outputPath, `${JSON.stringify(assignments, null, 2)}\n`);

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
  assignReviewers,
};
