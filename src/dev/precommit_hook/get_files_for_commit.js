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
 * Get the files that are staged for commit (excluding deleted files)
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String} gitRef
 * @param  {{ includeUntracked?: boolean }} options
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit(gitRef, options = {}) {
  const { includeUntracked = false } = options;
  const simpleGit = new SimpleGit(REPO_ROOT);
  const gitRefForDiff = gitRef ? gitRef : '--cached';
  const output = await simpleGit.diff(['--name-status', gitRefForDiff]);

  const trackedPaths = output
    .split('\n')
    // Ignore blank lines
    .filter((line) => line.trim().length > 0)
    // git diff --name-status outputs lines with two OR three parts
    // separated by a tab character
    .map((line) => line.trim().split('\t'))
    .map(([status, ...paths]) => {
      // ignore deleted files
      if (status === 'D') {
        return undefined;
      }

      // the status is always in the first column
      // .. If the file is edited the line will only have two columns
      // .. If the file is renamed it will have three columns
      // .. In any case, the last column is the CURRENT path to the file
      return paths[paths.length - 1];
    })
    .filter(Boolean);

  if (!includeUntracked) {
    return trackedPaths.map((path) => new File(path));
  }

  const untrackedOutput = await simpleGit.raw(['ls-files', '--others', '--exclude-standard']);
  const untrackedPaths = untrackedOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return [...new Set([...trackedPaths, ...untrackedPaths])].map((path) => new File(path));
}
