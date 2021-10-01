/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format } from 'util';
import SimpleGit from 'simple-git';
import { fromNode as fcb } from 'bluebird';

import { REPO_ROOT } from '@kbn/utils';
import { File } from '../file';

/**
 * Return the `git diff` argument used for building the list of files
 *
 * @param  {String} gitRef
 * @return {String}
 *
 *   gitRef               return
 *   ''                   '--cached'
 *   '<ref>'              '<ref>~1..<ref>'
 *   '<ref>..'            '<ref>..'
 *   '<ref>...'           '<ref>...'
 *   '..<ref>'            '..<ref>'
 *   '...<ref>'           '...<ref>'
 *   '<ref_A>..<ref_B>'   '<ref_A>..<ref_B>'
 *   '<ref_A>...<ref_B>'  '<ref_A>...<ref_B>'
 */
function getRefForDiff(gitRef) {
  if (!gitRef) {
    return '--cached';
  } else if (gitRef.includes('..')) {
    return gitRef;
  } else {
    return format('%s~1..%s', gitRef, gitRef);
  }
}

/**
 * Return the <ref> used for reading files content
 *
 * @param  {String} gitRef
 * @return {String}
 *
 *   gitRef               return
 *   ''                   ''
 *   '<ref>'              '<ref>'
 *   '<ref>..'            'HEAD'
 *   '<ref>...'           'HEAD'
 *   '..<ref>'            '<ref>'
 *   '...<ref>'           '<ref>'
 *   '<ref_A>..<ref_B>'   '<ref_B>'
 *   '<ref_A>...<ref_B>'  '<ref_B>'
 */
function getRefForCat(gitRef) {
  if (!gitRef) {
    return '';
  } else if (gitRef.includes('..')) {
    return gitRef.endsWith('..') ? 'HEAD' : gitRef.slice(gitRef.lastIndexOf('..') + 2);
  } else {
    return gitRef;
  }
}

/**
 * Get the files that are staged for commit (excluding deleted files)
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String} gitRef
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit(gitRef) {
  const simpleGit = new SimpleGit(REPO_ROOT);
  const gitRefForDiff = getRefForDiff(gitRef);
  const gitRefForCat = getRefForCat(gitRef);

  const output = await fcb((cb) => {
    simpleGit.diff(['--diff-filter=d', '--name-only', gitRefForDiff], cb);
  });

  return (
    output
      .split('\n')
      // Ignore blank lines
      .filter((line) => line.trim().length > 0)
      .map((path) => {
        const file = new File(path);
        const object = format('%s:%s', gitRefForCat, path);
        file.setFileReader(() => fcb((cb) => simpleGit.catFile(['-p', object], cb)));
        return file;
      })
  );
}
