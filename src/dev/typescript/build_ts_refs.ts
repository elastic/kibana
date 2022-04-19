/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { ProcRunner } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/utils';

import { ROOT_REFS_CONFIG_PATH } from './root_refs_config';
import { Project } from './project';

export async function buildTsRefs({
  log,
  procRunner,
  verbose,
  project,
}: {
  log: ToolingLog;
  procRunner: ProcRunner;
  verbose?: boolean;
  project?: Project;
}): Promise<{ failed: boolean }> {
  const relative = Path.relative(REPO_ROOT, project ? project.tsConfigPath : ROOT_REFS_CONFIG_PATH);
  log.info(`Building TypeScript projects refs for ${relative}...`);

  try {
    await procRunner.run('tsc', {
      cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
      args: ['-b', relative, '--pretty', ...(verbose ? ['--verbose'] : [])],
      cwd: REPO_ROOT,
      wait: true,
    });
    return { failed: false };
  } catch (error) {
    return { failed: true };
  }
}
