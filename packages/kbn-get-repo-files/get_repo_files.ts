/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RepoPath } from '@kbn/repo-path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getRepoRels } from '@kbn/repo-packages';

/**
 * List the files in the repo, only including files which are manged by version
 * control or "untracked" (new, not committed, and not ignored).
 * @param include limit the list to specfic absolute paths
 * @param exclude exclude specific absolute paths
 */
export async function getRepoFiles(include?: string[], exclude?: string[]) {
  return Array.from(
    await getRepoRels(REPO_ROOT, include, exclude),
    (rel) => new RepoPath(REPO_ROOT, rel)
  );
}
