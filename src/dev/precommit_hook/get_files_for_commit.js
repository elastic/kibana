/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import SimpleGit from 'simple-git';
import { fromNode as fcb } from 'bluebird';

import { REPO_ROOT } from '../constants';
import { File } from '../file';

/**
 * Get the files that are staged for commit (excluding deleted files)
 * as `File` objects that are aware of their commit status.
 *
 * @param  {String} repoPath
 * @return {Promise<Array<File>>}
 */
export async function getFilesForCommit() {
  const simpleGit = new SimpleGit(REPO_ROOT);

  const output = await fcb((cb) => simpleGit.diff(['--name-status', '--cached'], cb));

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
