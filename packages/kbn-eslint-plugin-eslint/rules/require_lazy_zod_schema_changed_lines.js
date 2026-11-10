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

/** @type {{ base: string; changedFiles: Set<string>; addedFiles: Set<string>; baseSourceFiles: Set<string>; removedSourceChunks: string[] | null; renamedFiles: Map<string, string>; untrackedFiles: Set<string>; capturedAt: number } | null | undefined} */
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
  const addedFiles = new Set();
  const baseSourceFiles = new Set();
  const renamedFiles = new Map();
  const entries = status.split('\0');
  for (let index = 0; index < entries.length - 1; ) {
    const code = entries[index++];
    const oldPath = entries[index++];
    if (code.startsWith('R') || code.startsWith('C')) {
      const newPath = entries[index++];
      changedFiles.add(newPath);
      renamedFiles.set(newPath, oldPath);
      if (/\.(?:[cm]?[jt]sx?)$/.test(oldPath)) {
        baseSourceFiles.add(oldPath);
      }
    } else {
      changedFiles.add(oldPath);
      if (code.startsWith('A')) {
        addedFiles.add(oldPath);
      } else if (/^(?:M|D)/.test(code) && /\.(?:[cm]?[jt]sx?)$/.test(oldPath)) {
        baseSourceFiles.add(oldPath);
      }
    }
  }
  return { changedFiles, addedFiles, baseSourceFiles, renamedFiles };
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

    const { changedFiles, addedFiles, baseSourceFiles, renamedFiles } = parseChangedFiles(
      git(['diff', '--name-status', '-z', '--find-renames', base, '--'])
    );
    snapshot = {
      base,
      capturedAt,
      changedFiles,
      addedFiles,
      baseSourceFiles,
      removedSourceChunks: null,
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
 * @param {string} [sourceText] Linted text. When it differs from disk, every line counts as changed.
 * @returns {LineRange[] | null}
 */
const getChangedLines = (filename, sourceText) => {
  if (typeof filename !== 'string' || !path.isAbsolute(filename) || !fs.existsSync(filename)) {
    return null; // RuleTester and new editor buffers have no on-disk file.
  }
  if (
    typeof sourceText === 'string' &&
    sourceText !== fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')
  ) {
    return null; // Unsaved editor buffer: the diff on disk does not describe it.
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

/**
 * Parses contiguous removed source lines from a zero-context diff.
 * @param {string} diff
 * @returns {string[]}
 */
const parseRemovedSourceChunks = (diff) => {
  const chunks = [];
  let current = [];
  const flush = () => {
    if (current.length > 0) {
      chunks.push(current.join('\n'));
      current = [];
    }
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('-') && !line.startsWith('---')) {
      current.push(line.slice(1));
    } else {
      flush();
    }
  }
  flush();
  return chunks;
};

/**
 * Gets contiguous source text removed from changed source files.
 * @param {string} base
 * @param {Set<string>} files
 * @returns {string[]}
 */
const getRemovedSourceChunks = (base, files) => {
  if (files.size === 0) {
    return [];
  }
  const diff = git(['diff', '--no-ext-diff', '--no-color', '--unified=0', base, '--', ...files]);
  return parseRemovedSourceChunks(diff);
};

/**
 * @param {string} declaration
 * @param {string[]} removedSourceChunks
 * @returns {boolean}
 */
const isDeclarationInRemovedSource = (declaration, removedSourceChunks) =>
  removedSourceChunks.some((chunk) => {
    for (let index = chunk.indexOf(declaration); index !== -1; ) {
      const prefix = chunk.slice(chunk.lastIndexOf('\n', index - 1) + 1, index);
      // Reject an indented `const`, which is a function-local declaration, not a module-level one.
      if (/^(?:export\s+)?(?:const\s+)?$|^\s*$/.test(prefix)) {
        return true;
      }
      index = chunk.indexOf(declaration, index + 1);
    }
    return false;
  });

/**
 * Checks whether an exact declaration in an added file already existed in the base tree.
 * @param {string} filename
 * @param {string} declaration
 * @returns {boolean}
 */
const isUnchangedInAddedFile = (filename, declaration) => {
  if (!snapshot || typeof filename !== 'string' || !path.isAbsolute(filename)) {
    return false;
  }
  const relative = path.relative(ROOT, filename).split(path.sep).join('/');
  if (!snapshot.addedFiles.has(relative) || !declaration.trim()) {
    return false;
  }

  try {
    if (snapshot.removedSourceChunks === null) {
      snapshot.removedSourceChunks = getRemovedSourceChunks(
        snapshot.base,
        snapshot.baseSourceFiles
      );
    }
    return isDeclarationInRemovedSource(declaration, snapshot.removedSourceChunks);
  } catch {
    return false;
  }
};

module.exports = {
  getChangedLines,
  getRemovedSourceChunks,
  parseRemovedSourceChunks,
  isUnchangedInAddedFile,
  isDeclarationInRemovedSource,
  parseChangedFiles,
  parseChangedLines,
  touchesChangedLine,
};
