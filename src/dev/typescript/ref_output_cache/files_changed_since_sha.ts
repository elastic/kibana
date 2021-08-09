/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import execa from 'execa';

export async function getFilesChangedSinceSha(log: ToolingLog, sha: string) {
  log.debug('determining files changes since sha', sha);

  const proc = await execa('git', ['diff', '--name-only', sha], {
    cwd: REPO_ROOT,
  });
  const files = proc.stdout
    .trim()
    .split('\n')
    .map((p) => Path.resolve(REPO_ROOT, p));

  log.verbose('found the following changes compared to', sha, `\n - ${files.join('\n - ')}`);

  return files;
}
