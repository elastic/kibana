/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const Fs = require('fs');
const ChildProcess = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(ChildProcess.execFile);

/**
 * @param {string} repoRoot
 * @param {string} output
 * @param {boolean} isJJ
 * @returns {Iterable<string>}
 */
function parseFilesOutput(repoRoot, output, isJJ = false) {
  const files = new Set();

  for (const line of output.split('\n').map((l) => l.trim())) {
    if (!line) {
      continue;
    }
    if (isJJ) {
      // jj only lists files that currently exist on disk
      files.add(line);
      continue;
    }

    const repoRel = line.slice(2); // trim the single char status and separating space from the line
    if (line.startsWith('C ')) {
      // this line indicates that the previous path is changed in the working
      // tree, so we need to determine if it was deleted and remove it if so
      if (!Fs.existsSync(Path.resolve(repoRoot, repoRel))) {
        files.delete(repoRel);
      }
    } else {
      files.add(repoRel);
    }
  }

  return files;
}

/**
 * @param {string} repoRoot
 * @param {string[] | undefined} include
 * @param {string[] | undefined} exclude
 * @returns {string[]}
 */
function getGitFlags(repoRoot, include = undefined, exclude = undefined) {
  return [
    'ls-files',
    '-comt',
    '--exclude-standard',
    include?.map((p) => (Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)) ?? [],
    exclude?.map((p) => `--exclude=${Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p}`) ?? [],
  ].flat();
}

/**
 * Detect a jj workspace that is not colocated with a git working tree. In this
 * case `git ls-files` cannot run because there is no `.git` directory, and
 * pointing it at the main workspace would reflect the wrong checkout.
 * @param {string} repoRoot
 * @returns {boolean}
 */
function isJjOnlyWorkspace(repoRoot) {
  return Fs.existsSync(Path.join(repoRoot, '.jj')) && !Fs.existsSync(Path.join(repoRoot, '.git'));
}

/**
 * @param {string} repoRoot
 * @param {string[] | undefined} include
 * @param {string[] | undefined} exclude
 * @returns {string[]}
 */
function getJjFlags(repoRoot, include = undefined, exclude = undefined) {
  const args = ['file', 'list'];
  const includes = include?.map((p) => (Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)) ?? [];
  const excludes = exclude?.map((p) => (Path.isAbsolute(p) ? Path.relative(repoRoot, p) : p)) ?? [];

  if (!includes.length && !excludes.length) {
    return args;
  }

  const base = includes.length ? includes.join(' | ') : 'all()';
  const expr = excludes.length ? `(${base}) ~ (${excludes.join(' | ')})` : base;
  args.push('--', expr);
  return args;
}

/**
 * List the files in the repo, only including files which are manged by version
 * control or "untracked" (new, not committed, and not ignored).
 * @param {string} repoRoot limit the list to specfic absolute paths
 * @param {string[] | undefined} include limit the list to specfic absolute paths
 * @param {string[] | undefined} exclude exclude specific absolute paths
 * @returns {Promise<Iterable<string>>}
 */
async function getRepoRels(repoRoot, include = undefined, exclude = undefined) {
  if (isJjOnlyWorkspace(repoRoot)) {
    const proc = await execAsync('jj', getJjFlags(repoRoot, include, exclude), {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: Infinity,
    });
    return parseFilesOutput(repoRoot, proc.stdout, true);
  }

  const proc = await execAsync('git', getGitFlags(repoRoot, include, exclude), {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: Infinity,
  });

  return parseFilesOutput(repoRoot, proc.stdout);
}

/**
 * Synchronously list the files in the repo, only including files which are manged by version
 * control or "untracked" (new, not committed, and not ignored).
 * @param {string} repoRoot limit the list to specfic absolute paths
 * @param {string[] | undefined} include limit the list to specfic absolute paths
 * @param {string[] | undefined} exclude exclude specific absolute paths
 * @returns {Iterable<string>}
 */
function getRepoRelsSync(repoRoot, include = undefined, exclude = undefined) {
  if (isJjOnlyWorkspace(repoRoot)) {
    const stdout = ChildProcess.execFileSync('jj', getJjFlags(repoRoot, include, exclude), {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    return parseFilesOutput(repoRoot, stdout, true);
  }

  const stdout = ChildProcess.execFileSync('git', getGitFlags(repoRoot, include, exclude), {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return parseFilesOutput(repoRoot, stdout);
}

module.exports = { getRepoRels, getRepoRelsSync };
