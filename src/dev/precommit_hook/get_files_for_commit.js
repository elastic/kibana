/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import SimpleGit from 'simple-git';
import { fromNode as fcb } from 'bluebird';

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
  const gitCatPrefix = gitRef ? gitRef + ':' : ':';

  const output = await fcb((cb) => {
    if (gitRef) {
      simpleGit.show(['--diff-filter=d', '--name-only', '--pretty=format:', gitRef], cb);
    } else {
      simpleGit.diff(['--diff-filter=d', '--name-only', '--cached'], cb);
    }
  });

  return (
    output
      .split('\n')
      // Ignore blank lines
      .filter((line) => line.trim().length > 0)
      .map((path) => {
        const file = new File(path);
        file.setFileReader(() => fcb((cb) => simpleGit.catFile(['-p', gitCatPrefix + path], cb)));
        return file;
      })
  );
}
