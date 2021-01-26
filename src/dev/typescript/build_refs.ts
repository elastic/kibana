/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import execa from 'execa';
import Path from 'path';
import { run, ToolingLog } from '@kbn/dev-utils';

export async function buildAllRefs(log: ToolingLog) {
  await buildRefs(log, 'tsconfig.refs.json');
  await buildRefs(log, Path.join('x-pack', 'tsconfig.refs.json'));
}

async function buildRefs(log: ToolingLog, projectPath: string) {
  try {
    log.debug(`Building TypeScript projects refs for ${projectPath}...`);
    await execa(require.resolve('typescript/bin/tsc'), ['-b', projectPath, '--pretty']);
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
}

export async function runBuildRefs() {
  run(
    async ({ log }) => {
      await buildAllRefs(log);
    },
    {
      description: 'Build TypeScript projects',
    }
  );
}
