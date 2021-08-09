/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import execa from 'execa';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';

export const REF_CONFIG_PATHS = [Path.resolve(REPO_ROOT, 'tsconfig.refs.json')];

export async function buildAllTsRefs(log: ToolingLog): Promise<{ failed: boolean }> {
  for (const path of REF_CONFIG_PATHS) {
    const relative = Path.relative(REPO_ROOT, path);
    log.debug(`Building TypeScript projects refs for ${relative}...`);
    const { failed, stdout } = await execa(
      require.resolve('typescript/bin/tsc'),
      ['-b', relative, '--pretty'],
      {
        cwd: REPO_ROOT,
        reject: false,
      }
    );
    log.info(stdout);
    if (failed) return { failed };
  }
  return { failed: false };
}
