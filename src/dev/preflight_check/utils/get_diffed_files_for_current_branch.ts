/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import simpleGit from 'simple-git';
import { existsSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { nonNullable } from './non_nullable';

const HASH_FOR_NULL_OR_DELETED_FILE = '00000000000';

export async function getDiffedFilesForCurrentBranch() {
  const git = simpleGit(REPO_ROOT);

  const { current } = await git.branchLocal();

  const commonAncestor = (await git.raw(['merge-base', 'origin/main', current])).trim();

  const diff = await git.diff([`${commonAncestor}..${current}`]);

  return diff
    .split('diff --git')
    .filter(Boolean)
    .map((file) => {
      const path = String(file.split(' b/')[1]).split('\n')[0];
      if (!existsSync(path)) return undefined;

      const [firstHash, secondHash] = String(file.split('index ')[1]).split('\n')[0].split('..');
      const hunk = file.split(/@@ -[0-9]+,[0-9]+ \+[0-9]+,[0-9]+ @@/g)[1];

      const mode =
        firstHash === HASH_FOR_NULL_OR_DELETED_FILE
          ? 'new'
          : secondHash === HASH_FOR_NULL_OR_DELETED_FILE
          ? 'deleted'
          : 'modified';

      return {
        path,
        hunk,
        mode,
        added: hunk?.split('\n').filter((line) => line.startsWith('+')),
        removed: hunk?.split('\n').filter((line) => line.startsWith('-')),
      };
    })
    .filter(nonNullable);
}
