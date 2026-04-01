/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

import { getMoonExecutablePath, normalizeRepoRelativePath } from './query_projects';

type ChangedFilesScope = 'local' | 'staged' | 'branch';

export interface GetMoonChangedFilesOptions {
  scope: ChangedFilesScope;
  base?: string;
  head?: string;
}

interface MoonChangedFilesResponse {
  files: string[];
}

/** Builds CLI args for `moon query changed-files` based on scope. */
export const buildChangedFilesArgs = ({ scope, base, head }: GetMoonChangedFilesOptions) => {
  const args = ['query', 'changed-files'];

  switch (scope) {
    case 'local':
      args.push('--local');
      break;
    case 'staged':
      args.push('--local', '--status', 'staged');
      break;
    case 'branch':
      if (base) args.push('--base', base);
      if (head) args.push('--head', head);
      break;
  }

  return args;
};

/**
 * Queries Moon for changed files in the given scope.
 *
 * Returns repo-relative paths of files that exist on disk (deleted files are excluded).
 */
export const getMoonChangedFiles = async ({
  scope,
  base,
  head,
}: GetMoonChangedFilesOptions): Promise<string[]> => {
  const execa = (await import('execa')).default;
  const moonExec = await getMoonExecutablePath();
  const args = buildChangedFilesArgs({ scope, base, head });

  const { stdout } = await execa(moonExec, args, {
    cwd: REPO_ROOT,
    stdin: 'ignore',
    env: {
      ...process.env,
      CI_STATS_DISABLED: 'true',
    },
  });

  const { files } = JSON.parse(stdout) as MoonChangedFilesResponse;

  return files
    .map(normalizeRepoRelativePath)
    .filter((file) => existsSync(Path.resolve(REPO_ROOT, file)))
    .sort((a, b) => a.localeCompare(b));
};
