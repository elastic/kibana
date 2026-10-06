/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

/** @typedef {{ start: number; end: number }} LineRange */

/** @type {{ base: string; changedFiles: Set<string>; renamedFiles: Map<string, string>; untrackedFiles: Set<string>; capturedAt: number } | null | undefined} */
let snapshot;

/**
 * @param {string[]} args
 * @returns {string}
 */
const git = (args) =>
  execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

/**
 * @param {string} status
 */
const parseChangedFiles = (status) => {
  const changedFiles = new Set();
  const renamedFiles = new Map();
  const entries = status.split('\0');
  for (let index = 0; index < entries.length - 1; ) {
    const code = entries[index++];
    const oldPath = entries[index++];
    if (code.startsWith('R') || code.startsWith('C')) {
      const newPath = entries[index++];
      changedFiles.add(newPath);
      renamedFiles.set(newPath, oldPath);
    } else {
      changedFiles.add(oldPath);
    }
  }
  return { changedFiles, renamedFiles };
};

/**
 * @returns {typeof snapshot}
 */
const getSnapshot = () => {
  if (snapshot !== undefined) {
    return snapshot;
  }

  try {
    const capturedAt = Date.now();
    let base;
    for (const ref of ['upstream/main', 'origin/main', 'main']) {
      try {
        const candidate = git(['merge-base', 'HEAD', ref]);
        if (!base || git(['merge-base', '--is-ancestor', base, candidate]) === '') {
          base = candidate;
        }
      } catch {
        // A checkout may have only one of these refs.
      }
    }
    if (!base) {
      snapshot = null;
      return snapshot;
    }

    const { changedFiles, renamedFiles } = parseChangedFiles(
      git(['diff', '--name-status', '-z', '--find-renames', base, '--'])
    );
    snapshot = {
      base,
      capturedAt,
      changedFiles,
      renamedFiles,
      untrackedFiles: new Set(
        git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0')
      ),
    };
  } catch {
    // Without a reliable diff, leave existing schemas alone.
    snapshot = null;
  }
  return snapshot;
};

/**
 * @param {string} diff
 * @returns {LineRange[]}
 */
const parseChangedLines = (diff) => {
  /** @type {LineRange[]} */
  const ranges = [];
  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  for (const match of diff.matchAll(hunk)) {
    const start = Math.max(1, Number(match[1]));
    const count = match[2] === undefined ? 1 : Number(match[2]);
    ranges.push({ start, end: start + Math.max(1, count) - 1 });
  }
  return ranges;
};

/**
 * @param {string} filename
 * @returns {LineRange[] | null}
 */
const getChangedLines = (filename) => {
  if (typeof filename !== 'string' || !path.isAbsolute(filename) || !fs.existsSync(filename)) {
    return null; // RuleTester and new editor buffers have no on-disk file.
  }

  const relative = path.relative(ROOT, filename).split(path.sep).join('/');
  if (relative.startsWith('../') || relative === '..') {
    return null;
  }

  if (snapshot && fs.statSync(filename).mtimeMs > snapshot.capturedAt) {
    snapshot = undefined; // Pick up files changed after a long-running editor loaded this rule.
  }
  const current = getSnapshot();
  if (!current) {
    return [];
  }
  if (current.untrackedFiles.has(relative)) {
    return null; // Every line in a new file is added.
  }
  if (!current.changedFiles.has(relative)) {
    return [];
  }

  try {
    const paths = [relative];
    const oldPath = current.renamedFiles.get(relative);
    if (oldPath) {
      paths.unshift(oldPath);
    }
    const diff = git([
      'diff',
      '--find-renames',
      '--no-ext-diff',
      '--no-color',
      '--unified=0',
      current.base,
      '--',
      ...paths,
    ]);
    return parseChangedLines(diff);
  } catch {
    return [];
  }
};

/**
 * @param {LineRange[] | null} ranges
 * @param {{ loc?: { start: { line: number }; end: { line: number } } }} node
 * @returns {boolean}
 */
const touchesChangedLine = (ranges, node) =>
  ranges === null ||
  Boolean(
    node.loc &&
      ranges.some(({ start, end }) => start <= node.loc.end.line && end >= node.loc.start.line)
  );

module.exports = { getChangedLines, parseChangedFiles, parseChangedLines, touchesChangedLine };
