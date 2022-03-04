/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import SimpleGit from 'simple-git/promise';

import { REPO_ROOT } from '@kbn/utils';
import { File } from '../file';

/**
 * Get the files that are staged for commit (excluding deleted files)
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String} gitRef
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit(gitRef) {
  const simpleGit = new SimpleGit(REPO_ROOT);
  const gitRefForDiff = gitRef ? gitRef : '--cached';
  const output = await simpleGit.diff(['--name-status', gitRefForDiff]);

  return (
    output
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
        return new File(paths[paths.length - 1]);
      })
      .filter(Boolean)
  );
}
