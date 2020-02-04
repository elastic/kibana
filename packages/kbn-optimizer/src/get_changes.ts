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

import Path from 'path';

import execa from 'execa';
import isPathInside from 'is-path-inside';

import { descending } from './common';

export type Changes = Map<string, 'modified' | 'deleted'>;

/**
 * get the changes in all the context directories (plugin public paths)
 */
export async function getChanges(repoRoot: string, dirs: string[]) {
  const { stdout } = await execa('git', ['ls-files', '-dmt', '--', ...dirs], {
    cwd: repoRoot,
  });

  const output = stdout.trim();
  const unassignedChanges: Changes = new Map();

  if (output) {
    for (const line of output.split('\n')) {
      const [tag, ...pathParts] = line.trim().split(' ');
      const path = Path.resolve(repoRoot, pathParts.join(' '));
      switch (tag) {
        case 'M':
        case 'C':
          // for some reason ls-files returns deleted files as both deleted
          // and modified, so make sure not to overwrite changes already
          // tracked as "deleted"
          if (unassignedChanges.get(path) !== 'deleted') {
            unassignedChanges.set(path, 'modified');
          }
          break;

        case 'R':
          unassignedChanges.set(path, 'deleted');
          break;

        default:
          throw new Error(`unexpected path status ${tag} for path ${path}`);
      }
    }
  }

  const changesByDir = new Map<string, Changes>();
  const dirsBySpecificity = Array.from(dirs).sort(descending(dir => dir.length));

  for (const dir of dirsBySpecificity) {
    const ownChanges: Changes = new Map();
    for (const [path, type] of unassignedChanges) {
      if (isPathInside(path, dir)) {
        ownChanges.set(path, type);
        unassignedChanges.delete(path);
      }
    }

    changesByDir.set(dir, ownChanges);
  }

  if (unassignedChanges.size) {
    throw new Error(
      `unable to assign all change paths to a project: ${JSON.stringify(
        Array.from(unassignedChanges.entries())
      )}`
    );
  }

  return changesByDir;
}
