/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import execa from 'execa';

import { REPO_ROOT } from '@kbn/dev-utils';

export type Changes = Map<string, 'modified' | 'deleted'>;

/**
 * get the changes in all the context directories (plugin public paths)
 */
export async function getChanges(relativeDir: string) {
  const changes: Changes = new Map();

  const { stdout } = await execa('git', ['ls-files', '-dmt', '--', relativeDir], {
    cwd: REPO_ROOT,
  });

  const output = stdout.trim();

  if (output) {
    for (const line of output.split('\n')) {
      const [tag, ...pathParts] = line.trim().split(' ');
      const path = Path.resolve(REPO_ROOT, pathParts.join(' '));
      switch (tag) {
        case 'M':
        case 'C':
          // for some reason ls-files returns deleted files as both deleted
          // and modified, so make sure not to overwrite changes already
          // tracked as "deleted"
          if (changes.get(path) !== 'deleted') {
            changes.set(path, 'modified');
          }
          break;

        case 'R':
          changes.set(path, 'deleted');
          break;

        default:
          throw new Error(`unexpected path status ${tag} for path ${path}`);
      }
    }
  }

  return changes;
}
