/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SimpleGit from 'simple-git';

import { REPO_ROOT } from '@kbn/repo-info';
import { File } from '../file';

/**
 * Get the files that are staged for commit
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String|String[]} gitRef
 * @param  {{ includeUntracked?: boolean }} options
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit(gitRef, options = {}) {
  const { includeUntracked = false } = options;
  const simpleGit = new SimpleGit(REPO_ROOT);
  const normalizedGitRef = Array.isArray(gitRef) ? gitRef.find(Boolean) : gitRef;
  const gitRefForDiff = normalizedGitRef ? normalizedGitRef : '--cached';
  const output = await simpleGit.diff(['--name-status', gitRefForDiff]);

  const filesFromDiff = output
    .split('\n')
    // Ignore blank lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim().split('\t'))
    .map(([statusSymbol, ...paths]) => {
      const status = {
        A: 'added',
        M: 'modified',
        R: 'renamed',
        D: 'deleted',
        C: 'copied',
        '?': 'untracked',
      }[statusSymbol[0]];

      return new File(paths[paths.length - 1], status);
    });

  if (!includeUntracked) {
    return filesFromDiff;
  }

  const untrackedOutput = await simpleGit.raw(['ls-files', '--others', '--exclude-standard']);
  const untrackedPaths = untrackedOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const trackedRelativePaths = new Set(filesFromDiff.map((f) => f.getRelativePath()));
  const untrackedFiles = untrackedPaths
    .filter((path) => !trackedRelativePaths.has(path))
    .map((path) => new File(path, 'untracked'));

  return [...filesFromDiff, ...untrackedFiles];
}
