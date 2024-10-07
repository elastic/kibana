/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const ChildProcess = require('child_process');

const cache = new Map();

/**
 * Synchronously get the git repo root for a given repoRoot and cache the result for the execution
 * @param {string} repoRoot
 * @returns {string | null}
 */
function getGitRepoRootSync(repoRoot) {
  if (cache.has(repoRoot)) {
    return cache.get(repoRoot);
  }

  try {
    const stdout = ChildProcess.execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: Infinity,
      stdio: 'pipe',
    });

    const firstLine = stdout.split('\n')[0];
    const trimPath = firstLine.trim();
    cache.set(repoRoot, Path.basename(trimPath) !== trimPath ? trimPath : null);

    return cache.get(repoRoot);
  } catch {
    cache.set(repoRoot, null);
    return null;
  }
}

module.exports = { getGitRepoRootSync };
