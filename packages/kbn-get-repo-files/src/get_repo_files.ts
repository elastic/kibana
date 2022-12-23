/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { RepoPath } from '@kbn/repo-path';

/**
 * List the files in the repo, only including files which are manged by version
 * control or "untracked" (new, not committed, and not ignored).
 * @param include limit the list to specfic absolute paths
 * @param exclude exclude specific absolute paths
 */
export async function getRepoFiles(include?: string[], exclude?: string[]) {
  const flags = [
    include?.map((p) => Path.relative(REPO_ROOT, p)) ?? [],
    exclude?.map((p) => `--exclude=${Path.relative(REPO_ROOT, p)}`) ?? [],
  ].flat();

  const proc = await execa('git', ['ls-files', '-comt', '--exclude-standard', ...flags], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    buffer: true,
  });

  const paths = new Map<string, RepoPath>();
  const files = new Set<RepoPath>();

  for (const line of proc.stdout.split('\n').map((l) => l.trim())) {
    if (!line) {
      continue;
    }

    const repoRel = line.slice(2); // trim the single char status and separating space from the line
    const existingPath = paths.get(repoRel);
    const path = existingPath ?? new RepoPath(REPO_ROOT, repoRel);
    if (!existingPath) {
      paths.set(repoRel, path);
    }

    if (line.startsWith('C ')) {
      // this line indicates that the previous path is changed in the working
      // tree, so we need to determine if it was deleted and remove it if so
      if (!Fs.existsSync(path.abs)) {
        files.delete(path);
      }
    } else {
      files.add(path);
    }
  }

  return files;
}
